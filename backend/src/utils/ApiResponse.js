export default class ApiResponse {
  static ok(res, data) {
    return res.status(200).json({ success: true, data });
  }

  static created(res, data) {
    return res.status(201).json({ success: true, data });
  }
}
