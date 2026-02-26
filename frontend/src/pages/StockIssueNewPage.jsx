import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import StockIssueForm from '@/components/stockIssue/StockIssueForm';

export default function StockIssueNewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <StockIssueForm
        mode="create"
        onSuccess={() => {
          toast.success('Stock issue saved');
          navigate('/stock-issue');
        }}
      />
    </div>
  );
}
