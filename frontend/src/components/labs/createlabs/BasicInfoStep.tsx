// src/components/labs/createlabs/BasicInfoStep.tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Type, AlignLeft, Clock, Users, Tag, Layers, GraduationCap } from 'lucide-react';
import {
    DifficultyLevel,
    DIFFICULTY_LABELS,
    DIFFICULTY_COLORS,
    CreateLabBasicInfo,
} from '@/types/labs';

interface BasicInfoStepProps {
    data: CreateLabBasicInfo;
    onChange: (field: keyof CreateLabBasicInfo, value: any) => void;
    errors?: Record<string, string>;
}

const difficultyOptions: Array<{ value: DifficultyLevel; label: string; color: string }> = [
    { value: DifficultyLevel.BEGINNER, label: DIFFICULTY_LABELS[DifficultyLevel.BEGINNER], color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: DifficultyLevel.INTERMEDIATE, label: DIFFICULTY_LABELS[DifficultyLevel.INTERMEDIATE], color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: DifficultyLevel.ADVANCED, label: DIFFICULTY_LABELS[DifficultyLevel.ADVANCED], color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: DifficultyLevel.EXPERT, label: DIFFICULTY_LABELS[DifficultyLevel.EXPERT], color: 'bg-red-100 text-red-700 border-red-200' },
];

export function BasicInfoStep({ data, onChange, errors }: BasicInfoStepProps) {
    const handleTagsChange = (value: string) => {
        const tags = value.split(',').map(t => t.trim()).filter(Boolean);
        onChange('tags', tags);
    };

    return (
        <div className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-slate-400" />
                    Lab Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                    id="name"
                    placeholder="Linux Basics 101"
                    value={data.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className={`bg-white border-slate-200 focus-visible:ring-indigo-500 ${errors?.name ? 'border-rose-300 focus-visible:ring-rose-500' : ''}`}
                />
                {errors?.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Slug Field */}
            <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    URL Slug <span className="text-rose-500">*</span>
                </Label>
                <Input
                    id="slug"
                    placeholder="linux-basics-101"
                    value={data.slug}
                    onChange={(e) => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className={`bg-white border-slate-200 focus-visible:ring-indigo-500 font-mono ${errors?.slug ? 'border-rose-300 focus-visible:ring-rose-500' : ''}`}
                />
                <p className="text-xs text-slate-500">
                    URL-friendly identifier: lowercase letters, numbers, and hyphens only
                </p>
                {errors?.slug && <p className="text-xs text-rose-500">{errors.slug}</p>}
            </div>

            {/* Short Description */}
            <div className="space-y-2">
                <Label htmlFor="short_description" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                    Short Description
                </Label>
                <Input
                    id="short_description"
                    placeholder="Brief summary for lab listings (max 255 chars)"
                    maxLength={255}
                    value={data.short_description}
                    onChange={(e) => onChange('short_description', e.target.value)}
                    className="bg-white border-slate-200 focus-visible:ring-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Shown in lab cards and listings</span>
                    <span>{data.short_description?.length || 0}/255</span>
                </div>
            </div>

            {/* Full Description */}
            <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                    Full Description <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                    id="description"
                    placeholder="Detailed description of the lab, learning objectives, and what trainees will accomplish..."
                    rows={4}
                    value={data.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    className={`bg-white border-slate-200 focus-visible:ring-indigo-500 ${errors?.description ? 'border-rose-300 focus-visible:ring-rose-500' : ''}`}
                />
                {errors?.description && <p className="text-xs text-rose-500">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Difficulty */}
                <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        Difficulty Level
                    </Label>
                    <Select
                        value={data.difficulty}
                        onValueChange={(value) => onChange('difficulty', value)}
                    >
                        <SelectTrigger className="bg-white border-slate-200 focus:ring-indigo-500">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {difficultyOptions.map((diff) => (
                                <SelectItem key={diff.value} value={diff.value}>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-[10px] ${diff.color}`}>
                                            {diff.label}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        Category
                    </Label>
                    <Input
                        id="category"
                        placeholder="e.g., Linux Fundamentals"
                        value={data.category}
                        onChange={(e) => onChange('category', e.target.value)}
                        className="bg-white border-slate-200 focus-visible:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Track */}
            <div className="space-y-2">
                <Label htmlFor="track" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                    Learning Track
                </Label>
                <Input
                    id="track"
                    placeholder="e.g., DevOps Engineer Path"
                    value={data.track}
                    onChange={(e) => onChange('track', e.target.value)}
                    className="bg-white border-slate-200 focus-visible:ring-indigo-500"
                />
                <p className="text-xs text-slate-500">
                    Group related labs into a learning progression
                </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    Tags
                </Label>
                <Input
                    id="tags"
                    placeholder="linux, bash, beginner, cli (comma separated)"
                    value={data.tags.join(', ')}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    className="bg-white border-slate-200 focus-visible:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                    {data.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Duration (minutes) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={data.duration_minutes}
                        onChange={(e) => onChange('duration_minutes', parseInt(e.target.value) || 0)}
                        className={`bg-white border-slate-200 focus-visible:ring-indigo-500 ${errors?.duration_minutes ? 'border-rose-300 focus-visible:ring-rose-500' : ''}`}
                    />
                    {errors?.duration_minutes && <p className="text-xs text-rose-500">{errors.duration_minutes}</p>}
                </div>

                {/* Max Concurrent Users */}
                <div className="space-y-2">
                    <Label htmlFor="max_users" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Max Concurrent Users <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                        id="max_users"
                        type="number"
                        min={1}
                        value={data.max_concurrent_users}
                        onChange={(e) => onChange('max_concurrent_users', parseInt(e.target.value) || 0)}
                        className={`bg-white border-slate-200 focus-visible:ring-indigo-500 ${errors?.max_concurrent_users ? 'border-rose-300 focus-visible:ring-rose-500' : ''}`}
                    />
                    {errors?.max_concurrent_users && <p className="text-xs text-rose-500">{errors.max_concurrent_users}</p>}
                </div>
            </div>
        </div>
    );
}