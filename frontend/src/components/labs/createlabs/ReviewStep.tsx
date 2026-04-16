// src/components/labs/createlabs/ReviewStep.tsx
import { Badge } from '@/components/ui/badge';
import { BookOpen, Server, GraduationCap, Check, Clock, Users, Tag, Layers } from 'lucide-react';
import {
    CreateLabFormData,
    DIFFICULTY_LABELS,
    LAB_STATUS_LABELS,
    VM_OS_TYPE_LABELS,
    GUACAMOLE_CONNECTION_LABELS,
    ContentBlockType,
    CONTENT_BLOCK_TYPE_LABELS,
} from '@/types/labs';

interface ReviewStepProps {
    data: CreateLabFormData;
}

export function ReviewStep({ data }: ReviewStepProps) {
    const totalSteps = data.guide.steps.length;
    const totalBlocks = data.guide.steps.reduce((acc, step) => acc + step.content_blocks.length, 0);
    const quizBlocks = data.guide.steps.flatMap(s => s.content_blocks).filter(b => b.type === ContentBlockType.QUIZ).length;
    const commandBlocks = data.guide.steps.flatMap(s => s.content_blocks).filter(b => b.type === ContentBlockType.COMMAND).length;

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{data.vm_templates.length}</div>
                    <div className="text-xs text-indigo-600">VMs</div>
                </div>
                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{totalSteps}</div>
                    <div className="text-xs text-indigo-600">Steps</div>
                </div>
                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{totalBlocks}</div>
                    <div className="text-xs text-indigo-600">Content Blocks</div>
                </div>
                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{data.basic_info.duration_minutes}</div>
                    <div className="text-xs text-indigo-600">Minutes</div>
                </div>
            </div>

            {/* Basic Info */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    Basic Information
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Name</span>
                        <span className="text-sm font-medium text-slate-800">{data.basic_info.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Slug</span>
                        <span className="text-sm font-mono text-slate-800">{data.basic_info.slug}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Difficulty</span>
                        <Badge variant="outline" className="text-xs">
                            {DIFFICULTY_LABELS[data.basic_info.difficulty]}
                        </Badge>
                    </div>
                    {data.basic_info.category && (
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Category</span>
                            <span className="text-sm text-slate-800">{data.basic_info.category}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Duration</span>
                        <div className="flex items-center gap-1 text-sm text-slate-800">
                            <Clock className="h-3 w-3" />
                            {data.basic_info.duration_minutes} min
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Max Users</span>
                        <div className="flex items-center gap-1 text-sm text-slate-800">
                            <Users className="h-3 w-3" />
                            {data.basic_info.max_concurrent_users}
                        </div>
                    </div>
                    {data.basic_info.tags.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-1 mb-2">
                                <Tag className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500">Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {data.basic_info.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* VMs */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Server className="h-4 w-4 text-blue-600" />
                    VM Templates ({data.vm_templates.length})
                </div>
                <div className="space-y-2">
                    {data.vm_templates.map((vm, index) => (
                        <div key={vm.id} className="flex justify-between items-center py-2 px-3 bg-white rounded-md border border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-800">{vm.name || `VM ${index + 1}`}</span>
                                <Badge variant="outline" className="text-[10px]">
                                    {VM_OS_TYPE_LABELS[vm.os_type]}
                                </Badge>
                            </div>
                            <div className="text-xs text-slate-500">
                                {vm.cpu_cores} CPU • {vm.memory_mb}MB • {GUACAMOLE_CONNECTION_LABELS[vm.guacamole_connection_type]}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Guide Summary */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Lab Guide Content
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Introduction</span>
                        <span className="text-slate-800">{data.guide.introduction ? '✓ Configured' : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Prerequisites</span>
                        <span className="text-slate-800">{data.guide.prerequisites.length} items</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Steps</span>
                        <span className="text-slate-800">{totalSteps} steps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Content Blocks</span>
                        <span className="text-slate-800">{totalBlocks} total</span>
                    </div>
                    {quizBlocks > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Quiz Questions</span>
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                {quizBlocks} quizzes
                            </Badge>
                        </div>
                    )}
                    {commandBlocks > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Executable Commands</span>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                {commandBlocks} commands
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            {/* Assessment */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                    Assessment Settings
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Graded</span>
                        <Badge variant={data.assessment.is_graded ? "default" : "secondary"} className="text-[10px]">
                            {data.assessment.is_graded ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                    {data.assessment.is_graded && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Passing Score</span>
                            <span className="text-slate-800">{data.assessment.passing_score}%</span>
                        </div>
                    )}
                    {data.assessment.required_roles.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                            <span className="text-xs text-slate-500">Required Roles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {data.assessment.required_roles.map(role => (
                                    <Badge key={role} variant="outline" className="text-[10px]">{role}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">
                    Lab will be created as <strong>{LAB_STATUS_LABELS[data.status]}</strong>
                </span>
            </div>
        </div>
    );
}