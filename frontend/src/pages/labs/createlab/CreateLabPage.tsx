// src/pages/labs/createlab/CreateLabPage.tsx
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateLabWizard } from '@/components/labs/createlabs';
import { useCreateLab } from '@/hooks/labs/useLabMutations';
import {
    CreateLabFormData,  // Raw form data type
} from '@/types/labs';

export default function CreateLabPage() {
    const navigate = useNavigate();
    const createMutation = useCreateLab();

    // Receive raw form data - mutation handles transformation
    const handleSubmit = async (formData: CreateLabFormData) => {
        try {
            const result = await createMutation.mutateAsync({ data: formData });

            // Build success message with details
            const details: string[] = [];
            if (result.vm_templates?.length) details.push(`${result.vm_templates.length} VM(s)`);
            if (result.guide?.steps?.length) details.push(`${result.guide.steps.length} step(s)`);
            if (result.is_graded) details.push('Graded');

            const detailText = details.length > 0
                ? `Configured: ${details.join(', ')}`
                : 'Basic lab created';

            toast.success(`"${result.name}" created successfully`, {
                description: detailText,
            });

            navigate('/labs');
        } catch (error: any) {
            const message = error?.response?.data?.detail || error?.message || 'Failed to create lab. Please try again.';
            toast.error('Error creating lab', { description: message });
        }
    };

    return (
        <div className="space-y-4">
            <Button
                variant="ghost"
                onClick={() => navigate('/labs')}
                className="text-slate-600 hover:text-slate-800 -ml-2"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Labs
            </Button>

            <CreateLabWizard
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
}