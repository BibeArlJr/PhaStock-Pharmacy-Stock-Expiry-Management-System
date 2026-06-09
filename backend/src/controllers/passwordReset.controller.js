const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail.js');
const { hashPassword } = require('../services/auth.service.js');

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    console.log('[forgotPassword] Request received for email:', email)

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

    // DIAGNOSTIC — log exact DB being used
    const mongoose = require('mongoose')
    const dbName = mongoose.connection.db?.databaseName
    const dbHost = mongoose.connection.host
    const collectionName = User.collection.name
    console.log('[forgotPassword] Connected to DB host:', dbHost)
    console.log('[forgotPassword] Connected to DB name:', dbName)
    console.log('[forgotPassword] Querying collection:', collectionName)

    // DIAGNOSTIC — count all documents in users collection
    const totalUsers = await User.countDocuments()
    console.log('[forgotPassword] Total users in this DB:', totalUsers)

    // DIAGNOSTIC — list all emails in collection (remove after debugging)
    const allUsers = await User.find({}, { email: 1, _id: 0 }).limit(10)
    console.log('[forgotPassword] Emails found in DB:', allUsers.map(u => u.email))

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    console.log('[forgotPassword] Model methods available:', Object.keys(User.schema.methods))
    console.log('[forgotPassword] getResetPasswordToken type:', typeof user?.getResetPasswordToken)
    console.log('[forgotPassword] Searched for:', email.toLowerCase().trim())
    console.log('[forgotPassword] User found in DB:', user ? `YES (id: ${user._id})` : 'NO — email not matched')

    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' })
    }

    const rawToken = user.getResetPasswordToken()
    await user.save({ validateBeforeSave: false })
    console.log('[forgotPassword] Token generated and saved to DB')

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`
    console.log('[forgotPassword] Reset URL:', resetUrl)
    console.log('[forgotPassword] Sending email to:', user.email)
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Reset your PhaStock password</h2>
        <p>This link expires in <strong>10 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Reset Password</a>
        <p style="color:#999;font-size:12px">Or copy: ${resetUrl}</p>
      </div>`

    try {
      await sendEmail({ to: user.email, subject: 'PhaStock — Password Reset', html })
      console.log('[forgotPassword] ✓ Email sent successfully to:', user.email)
      return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' })
    } catch (emailErr) {
      console.error('[forgotPassword] ✗ Email FAILED:', emailErr.message)
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined
      await user.save({ validateBeforeSave: false })
      return res.status(500).json({ success: false, message: 'Email could not be sent. Try again later.' })
    }
  } catch (err) {
    console.error('[forgotPassword] Unexpected error:', err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });
    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });

    user.passwordHash = await hashPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { forgotPassword, resetPassword };

