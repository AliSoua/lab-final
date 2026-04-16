// src/components/labs/createlabs/GuideContentStep.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Plus,
    X,
    GripVertical,
    ChevronDown,
    ChevronUp,
    BookOpen,
    List,
    Type,
    Terminal,
    FileText,
    HelpCircle,
    AlertCircle,
    Image as ImageIcon,
    Video,
    Code,
} from 'lucide-react';
import {
    LabGuideFormData,
    LabStepFormData,
    ContentBlockFormData,
    ContentBlockType,
    CONTENT_BLOCK_TYPE_LABELS,
    CONTENT_BLOCK_TYPE_ICONS,
    createEmptyLabStep,
    createEmptyContentBlock,
} from '@/types/labs';

interface GuideContentStepProps {
    guide: LabGuideFormData;
    onChange: (field: keyof LabGuideFormData, value: any) => void;
    errors?: any;
}

const BLOCK_ICONS: Record<ContentBlockType, any> = {
    text: Type,
    html: Code,
    code: Terminal,
    command: Terminal,
    file: FileText,
    image: ImageIcon,
    video: Video,
    quiz: HelpCircle,
    alert: AlertCircle,
};

export function GuideContentStep({ guide, onChange, errors }: GuideContentStepProps) {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

    const handleAddStep = () => {
        const newStep = createEmptyLabStep(guide.steps.length + 1);
        onChange('steps', [...guide.steps, newStep]);
        setExpandedStep(newStep.id);
    };

    const handleRemoveStep = (id: string) => {
        onChange('steps', guide.steps.filter(s => s.id !== id));
    };

    const handleUpdateStep = (id: string, updates: Partial<LabStepFormData>) => {
        onChange('steps', guide.steps.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleAddBlock = (stepId: string, type: ContentBlockType) => {
        const newBlock = createEmptyContentBlock(type);
        onChange('steps', guide.steps.map(s => {
            if (s.id === stepId) {
                return { ...s, content_blocks: [...s.content_blocks, newBlock] };
            }
            return s;
        }));
        setExpandedBlock(newBlock.id);
    };

    const handleRemoveBlock = (stepId: string, blockId: string) => {
        onChange('steps', guide.steps.map(s => {
            if (s.id === stepId) {
                return { ...s, content_blocks: s.content_blocks.filter(b => b.id !== blockId) };
            }
            return s;
        }));
    };

    const handleUpdateBlock = (stepId: string, blockId: string, updates: Partial<ContentBlockFormData>) => {
        onChange('steps', guide.steps.map(s => {
            if (s.id === stepId) {
                return {
                    ...s,
                    content_blocks: s.content_blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
                };
            }
            return s;
        }));
    };

    return (
        <div className="space-y-6">
            {/* Introduction */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    Introduction <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                    placeholder="Welcome to this lab! In this exercise, you will learn..."
                    rows={4}
                    value={guide.introduction}
                    onChange={(e) => onChange('introduction', e.target.value)}
                    className={`bg-white border-slate-200 focus-visible:ring-indigo-500 ${errors?.introduction ? 'border-rose-300' : ''}`}
                />
                {errors?.introduction && <p className="text-xs text-rose-500">{errors.introduction}</p>}
            </div>

            {/* Prerequisites */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <List className="h-3.5 w-3.5 text-slate-400" />
                    Prerequisites
                </Label>
                <Textarea
                    placeholder="Basic Linux knowledge&#10;Familiarity with command line&#10;Docker installed (one per line)"
                    rows={3}
                    value={guide.prerequisites.join('\n')}
                    onChange={(e) => onChange('prerequisites', e.target.value.split('\n').filter(Boolean))}
                    className="bg-white border-slate-200 focus-visible:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                    {guide.prerequisites.map((pre, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                            {pre}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <List className="h-4 w-4 text-slate-400" />
                        Lab Steps ({guide.steps.length})
                    </h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddStep}
                        className="border-slate-200 hover:bg-slate-50"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Step
                    </Button>
                </div>

                {guide.steps.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-400">No steps defined yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Click "Add Step" to create the first lab step
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    {guide.steps.map((step, stepIndex) => {
                        const isExpanded = expandedStep === step.id;
                        const stepError = errors?.steps?.[stepIndex];

                        return (
                            <div
                                key={step.id}
                                className={`border rounded-lg transition-colors ${isExpanded ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200 bg-white'}`}
                            >
                                {/* Step Header */}
                                <div
                                    className="flex items-center gap-3 p-3 cursor-pointer"
                                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                                >
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                        {stepIndex + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={step.title}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                                                placeholder="Step title"
                                                className="h-7 text-sm font-medium border-0 bg-transparent focus-visible:ring-0 p-0 placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            {step.content_blocks.length} blocks • ~{step.estimated_minutes} min
                                            {stepError && <span className="text-rose-500">⚠ Errors</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveStep(step.id); }}
                                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Step Content */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 space-y-4 border-t border-slate-100 pt-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-600">Description</Label>
                                            <Input
                                                value={step.description}
                                                onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                                                placeholder="Brief description of this step"
                                                className="h-8 bg-white border-slate-200 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-600">Estimated Minutes</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={step.estimated_minutes}
                                                    onChange={(e) => handleUpdateStep(step.id, { estimated_minutes: parseInt(e.target.value) || 10 })}
                                                    className="h-8 bg-white border-slate-200"
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 pt-5">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={step.allow_skip}
                                                        onCheckedChange={(checked) => handleUpdateStep(step.id, { allow_skip: checked })}
                                                        id={`skip-${step.id}`}
                                                    />
                                                    <Label htmlFor={`skip-${step.id}`} className="text-xs text-slate-600 cursor-pointer">Allow Skip</Label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Blocks */}
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium text-slate-700">Content Blocks</Label>
                                                <div className="flex gap-1">
                                                    {(['text', 'command', 'code', 'quiz'] as ContentBlockType[]).map(type => {
                                                        const Icon = BLOCK_ICONS[type];
                                                        return (
                                                            <Button
                                                                key={type}
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleAddBlock(step.id, type)}
                                                                className="h-6 text-[10px] px-2"
                                                                title={CONTENT_BLOCK_TYPE_LABELS[type]}
                                                            >
                                                                <Icon className="h-3 w-3 mr-1" />
                                                                {type}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {step.content_blocks.map((block, blockIndex) => {
                                                    const isBlockExpanded = expandedBlock === block.id;
                                                    const BlockIcon = BLOCK_ICONS[block.type];

                                                    return (
                                                        <div key={block.id} className="border border-slate-200 rounded-md bg-white">
                                                            <div
                                                                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50"
                                                                onClick={() => setExpandedBlock(isBlockExpanded ? null : block.id)}
                                                            >
                                                                <BlockIcon className="h-3.5 w-3.5 text-slate-400" />
                                                                <span className="text-xs font-medium text-slate-700 uppercase">{block.type}</span>
                                                                <span className="text-xs text-slate-500 truncate flex-1">
                                                                    {block.title || block.content.substring(0, 50) || 'Empty block'}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveBlock(step.id, block.id); }}
                                                                    className="h-6 w-6 p-0 text-rose-500"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>

                                                            {isBlockExpanded && (
                                                                <div className="p-3 border-t border-slate-100 space-y-3">
                                                                    <Input
                                                                        placeholder="Block title (optional)"
                                                                        value={block.title}
                                                                        onChange={(e) => handleUpdateBlock(step.id, block.id, { title: e.target.value })}
                                                                        className="h-8 bg-white border-slate-200 text-sm"
                                                                    />

                                                                    {block.type === 'text' && (
                                                                        <Textarea
                                                                            placeholder="Enter markdown content..."
                                                                            rows={4}
                                                                            value={block.content}
                                                                            onChange={(e) => handleUpdateBlock(step.id, block.id, { content: e.target.value })}
                                                                            className="bg-white border-slate-200 text-sm"
                                                                        />
                                                                    )}

                                                                    {block.type === 'code' && (
                                                                        <Textarea
                                                                            placeholder="Enter code..."
                                                                            rows={4}
                                                                            value={block.content}
                                                                            onChange={(e) => handleUpdateBlock(step.id, block.id, { content: e.target.value })}
                                                                            className="bg-slate-50 border-slate-200 font-mono text-sm"
                                                                        />
                                                                    )}

                                                                    {block.type === 'command' && (
                                                                        <div className="space-y-2">
                                                                            <Textarea
                                                                                placeholder="Enter command description..."
                                                                                rows={2}
                                                                                value={block.content}
                                                                                onChange={(e) => handleUpdateBlock(step.id, block.id, { content: e.target.value })}
                                                                                className="bg-white border-slate-200 text-sm"
                                                                            />
                                                                            <Input
                                                                                placeholder="Command to execute: ls -la"
                                                                                value={block.command_config?.command || ''}
                                                                                onChange={(e) => handleUpdateBlock(step.id, block.id, {
                                                                                    command_config: { ...block.command_config, command: e.target.value } as any
                                                                                })}
                                                                                className="h-8 bg-slate-900 text-slate-100 border-slate-700 font-mono text-sm"
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {block.type === 'quiz' && (
                                                                        <div className="space-y-2">
                                                                            <Textarea
                                                                                placeholder="Question..."
                                                                                rows={2}
                                                                                value={block.content}
                                                                                onChange={(e) => handleUpdateBlock(step.id, block.id, { content: e.target.value })}
                                                                                className="bg-white border-slate-200 text-sm"
                                                                            />
                                                                            <div className="text-xs text-slate-500">Quiz editor would go here...</div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center gap-4 pt-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Switch
                                                                                checked={block.track_completion}
                                                                                onCheckedChange={(checked) => handleUpdateBlock(step.id, block.id, { track_completion: checked })}
                                                                                id={`track-${block.id}`}
                                                                            />
                                                                            <Label htmlFor={`track-${block.id}`} className="text-xs text-slate-600 cursor-pointer">Track Completion</Label>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Switch
                                                                                checked={block.required_to_complete}
                                                                                onCheckedChange={(checked) => handleUpdateBlock(step.id, block.id, { required_to_complete: checked })}
                                                                                id={`required-${block.id}`}
                                                                            />
                                                                            <Label htmlFor={`required-${block.id}`} className="text-xs text-slate-600 cursor-pointer">Required</Label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}