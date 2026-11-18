import { useNavigate, useSearchParams } from 'react-router-dom';
import OfflineView from '../components/pwa/OfflineView';

export default function OfflinePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from');
  const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';

  return (
    <div className="container page">
      <OfflineView onRetry={() => navigate(target, { replace: true })} />
    </div>
  );
}
