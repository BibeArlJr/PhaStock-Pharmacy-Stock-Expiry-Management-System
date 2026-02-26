import FullScreenLoader from '@/components/FullScreenLoader';

export default function AppLoadingOverlay({ show = false, label = 'Loading' }) {
  if (!show) return null;
  return <FullScreenLoader label={`${label}...`} />;
}
