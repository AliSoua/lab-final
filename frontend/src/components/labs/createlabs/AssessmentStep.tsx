// src/components/labs/createlabs/AssessmentStep.tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Shield, Users, Clock, RotateCcw } from 'lucide-react';
import {
    CreateLabAssessment,
} from '@/types/labs';

interface AssessmentStepProps {
    data: CreateLabAssessment;
    onChange: (field: keyof CreateLabAssessment, value: any) => void;
    errors?: Record<string, string>;
}

export function AssessmentStep({ data, onChange, errors }: AssessmentStepProps) {
    return (
        <div className="space-y-6">
            {/* Grading Toggle */}
            <div className={`p-4 rounded-lg border ${data.is_graded ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-indigo-600" />
                            Graded Lab
                        </Label>
                        <p className="text-xs text-slate-500">
                            Require passing score and track attempts
                        </p>
                    </div>
                    <Switch
                        checked={data.is_graded}
                        onCheckedChange={(checked) => onChange('is_graded', checked)}
                    />
                </div>

                {data.is_graded && (
                    <div className="mt-4 pt-4 border-t border-indigo-200 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-600">Passing Score (%)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={data.passing_score || 70}
                                    onChange={(e) => onChange('passing_score', parseInt(e.target.value) || 0)}
                                    className={`bg-white border-slate-200 ${errors?.passing_score ? 'border-rose-300' : ''}`}
                                />
                                {errors?.passing_score && <p className="text-xs text-rose-500">{errors.passing_score}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-600">Max Attempts (optional)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Unlimited"
                                    value={data.max_attempts || ''}
                                    onChange={(e) => onChange('max_attempts', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="bg-white border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Access Control */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Shield className="h-4 w-4 text-slate-600" />
                    Access Control
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Required Roles (comma separated)</Label>
                    <Input
                        placeholder="lab-moderator, senior-trainee"
                        value={data.required_roles.join(', ')}
                        onChange={(e) => onChange('required_roles', e.target.value.split(',').map(r => r.trim()).filter(Boolean))}
                        className="bg-white border-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                        Keycloak roles required to access this lab
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {data.required_roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Prerequisite Labs (IDs)</Label>
                    <Input
                        placeholder="uuid-1, uuid-2"
                        value={data.required_labs.join(', ')}
                        onChange={(e) => onChange('required_labs', e.target.value.split(',').map(id => id.trim()).filter(Boolean))}
                        className="bg-white border-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                        Labs that must be completed before accessing this one
                    </p>
                </div>
            </div>

            {/* Cooldown */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <RotateCcw className="h-4 w-4 text-slate-600" />
                    Cooldown Period
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Cooldown (minutes)</Label>
                    <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={data.cooldown_minutes || ''}
                        onChange={(e) => onChange('cooldown_minutes', parseInt(e.target.value) || 0)}
                        className="bg-white border-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                        Time before a trainee can request this lab again after completion
                    </p>
                </div>
            </div>
        </div>
    );
}