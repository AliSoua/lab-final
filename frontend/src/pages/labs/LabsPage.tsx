// frontend/src/pages/labs/LabDetailPage.tsx
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import {
    Clock,
    GraduationCap,
    Play,
    Server,
    ArrowLeft,
    Edit,
    Terminal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Mock lab data
const MOCK_LAB = {
    id: '1',
    name: 'Linux Basics 101',
    slug: 'linux-basics-101',
    description: 'Learn fundamental Linux commands and file system navigation. This lab provides hands-on experience with the Linux terminal.',
    short_description: 'Linux fundamentals for beginners',
    difficulty: 'beginner',
    category: 'Linux',
    duration_minutes: 60,
    status: 'published',
    created_by: 'admin',
    vm_templates: [
        { id: '9000', name: 'Ubuntu 22.04 LTS', os_type: 'linux' }
    ],
    guide: {
        introduction: 'Welcome to Linux Basics! You will learn essential commands.',
        steps: [
            { id: 'step-1', title: 'Getting Started', order: 1 },
            { id: 'step-2', title: 'File System Navigation', order: 2 },
            { id: 'step-3', title: 'File Operations', order: 3 },
        ]
    }
};

export default function LabDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, isModerator } = useAuthStore();

    const handleStartLab = () => {
        toast.success('Lab request submitted! (Mock)');
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'intermediate':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'advanced':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Back Navigation */}
            <Link to="/labs" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Labs
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getDifficultyColor(MOCK_LAB.difficulty)}>
                            {MOCK_LAB.difficulty}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-100">
                            {MOCK_LAB.category}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">{MOCK_LAB.name}</h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">{MOCK_LAB.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    {isModerator && (
                        <Link to={`/labs/${id}/edit`}>
                            <Button variant="outline" className="border-slate-200">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </Link>
                    )}
                    <Button
                        onClick={handleStartLab}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Start Lab
                    </Button>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Duration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-slate-800">
                            {MOCK_LAB.duration_minutes} minutes
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            Environment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium text-slate-800">
                            {MOCK_LAB.vm_templates[0]?.name || 'VM'}
                        </p>
                        <p className="text-sm text-slate-400">{MOCK_LAB.vm_templates[0]?.os_type}</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Your Role
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium text-slate-800 capitalize">
                            {user?.isAdmin ? 'Administrator' : user?.isModerator ? 'Moderator' : 'Trainee'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Guide Preview */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-emerald-600" />
                        Lab Guide
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-4">{MOCK_LAB.guide.introduction}</p>
                    <div className="space-y-2">
                        {MOCK_LAB.guide.steps.map((step, index) => (
                            <div
                                key={step.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700">
                                    {index + 1}
                                </div>
                                <span className="font-medium text-slate-700">{step.title}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}