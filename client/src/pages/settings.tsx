import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings as SettingsIcon, Brain, Key, Server, Headphones, Shield, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SettingsField {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'number' | 'select' | 'range' | 'textarea' | 'password' | 'switch' | 'button';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  hidden?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  fields: SettingsField[];
  tab: string;
}

interface SettingsData {
  sections: SettingsSection[];
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('agent');

  const { data: settings, isLoading } = useQuery<{ settings: SettingsData }>({
    queryKey: ['/api/settings']
  });

  useEffect(() => {
    if (settings?.settings) {
      const initialFormData: Record<string, any> = {};
      settings.settings.sections.forEach(section => {
        section.fields.forEach(field => {
          initialFormData[field.id] = field.value;
        });
      });
      setFormData(initialFormData);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: (data: Record<string, any>) => {
      return fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "✓ Settings Saved",
        description: "Configuration has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  });

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const renderField = (field: SettingsField) => {
    const value = formData[field.id] ?? field.value;

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-black border-purple-500/30 text-white focus:border-purple-400"
          />
        );

      case 'password':
        return (
          <Input
            type="password"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-black border-purple-500/30 text-white focus:border-purple-400"
            placeholder="Enter password..."
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
            className="bg-black border-purple-500/30 text-white focus:border-purple-400"
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-black border-purple-500/30 text-white focus:border-purple-400 min-h-[100px]"
            rows={5}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="bg-black border-purple-500/30 text-white focus:border-purple-400">
              <SelectValue placeholder="Select option..." />
            </SelectTrigger>
            <SelectContent className="bg-black border-purple-500/30">
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-purple-500/20">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <Slider
              value={[value || 0]}
              onValueChange={(vals) => handleFieldChange(field.id, vals[0])}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              className="w-full"
            />
            <div className="text-xs text-purple-300 text-center">
              {value?.toFixed(field.step && field.step < 1 ? 2 : 0)} 
              {field.min !== undefined && field.max !== undefined && 
                ` (${field.min} - ${field.max})`
              }
            </div>
          </div>
        );

      case 'switch':
        return (
          <Switch
            checked={value || false}
            onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            className="data-[state=checked]:bg-purple-500"
          />
        );

      default:
        return null;
    }
  };

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'agent': return <Brain className="w-4 h-4" />;
      case 'external': return <Globe className="w-4 h-4" />;
      case 'mcp': return <Server className="w-4 h-4" />;
      case 'audio': return <Headphones className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      default: return <SettingsIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-purple-500/20 rounded w-1/3"></div>
            <div className="h-64 bg-purple-500/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const tabGroups = settings?.settings.sections.reduce((acc: Record<string, SettingsSection[]>, section: SettingsSection) => {
    if (!acc[section.tab]) acc[section.tab] = [];
    acc[section.tab].push(section);
    return acc;
  }, {} as Record<string, SettingsSection[]>) || {};

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Pareng Boyong Settings
            </h1>
            <p className="text-purple-300 mt-2">Configure AI models, providers, and system settings</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
          >
            {saveSettingsMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black border border-purple-500/30 p-1">
            {Object.keys(tabGroups).map((tabId) => (
              <TabsTrigger
                key={tabId}
                value={tabId}
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  {getTabIcon(tabId)}
                  <span className="capitalize">
                    {tabId === 'mcp' ? 'MCP' : tabId}
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(tabGroups).map(([tabId, sections]) => (
            <TabsContent key={tabId} value={tabId} className="space-y-6">
              {sections.map((section: SettingsSection) => (
                <Card key={section.id} className="bg-black border-purple-500/30 p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-purple-400">
                        {section.title}
                      </h3>
                      <p 
                        className="text-purple-300 text-sm mt-1"
                        dangerouslySetInnerHTML={{ __html: section.description }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {section.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label 
                            htmlFor={field.id} 
                            className="text-white font-medium"
                          >
                            {field.title}
                          </Label>
                          {field.description && (
                            <p 
                              className="text-xs text-purple-300"
                              dangerouslySetInnerHTML={{ __html: field.description }}
                            />
                          )}
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Status Bar */}
        <div className="text-center text-purple-400 text-sm">
          Pareng Boyong AGI Configuration System • InnovateHub PH
        </div>
      </div>
    </div>
  );
}