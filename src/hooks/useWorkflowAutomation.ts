import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowTrigger {
  type: 'order_created' | 'order_status_changed' | 'delay_detected' | 'driver_assigned' | 'invoice_created' | 'custom_webhook';
  label: string;
  description: string;
  icon: string;
  configFields?: { name: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[];
}

export interface WorkflowActionType {
  type: 'send_email' | 'send_sms' | 'send_webhook' | 'update_status' | 'create_task' | 'notify_slack' | 'send_whatsapp';
  label: string;
  description: string;
  icon: string;
  configFields: { name: string; label: string; type: 'text' | 'number' | 'select' | 'textarea'; options?: string[]; placeholder?: string }[];
}

export interface WorkflowAction {
  id?: string;
  workflow_id?: string;
  action_type: string;
  action_config: Record<string, any>;
  sequence_order: number;
  delay_minutes: number;
  condition_expression?: string;
  is_active: boolean;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  is_active: boolean;
  run_count: number;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
  actions?: WorkflowAction[];
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  trigger_event: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  actions_executed: any[];
}

// Available triggers
export const WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  {
    type: 'order_created',
    label: 'Order aangemaakt',
    description: 'Trigger wanneer een nieuwe order wordt aangemaakt',
    icon: 'Package',
  },
  {
    type: 'order_status_changed',
    label: 'Status gewijzigd',
    description: 'Trigger wanneer een order status verandert',
    icon: 'RefreshCw',
    configFields: [
      { name: 'from_status', label: 'Van status', type: 'select', options: ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd', 'geannuleerd'] },
      { name: 'to_status', label: 'Naar status', type: 'select', options: ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd', 'geannuleerd'] },
    ],
  },
  {
    type: 'delay_detected',
    label: 'Vertraging gedetecteerd',
    description: 'Trigger wanneer een vertraging wordt gedetecteerd',
    icon: 'AlertTriangle',
    configFields: [
      { name: 'delay_threshold_minutes', label: 'Drempel (minuten)', type: 'number' },
    ],
  },
  {
    type: 'driver_assigned',
    label: 'Chauffeur toegewezen',
    description: 'Trigger wanneer een chauffeur wordt toegewezen aan een rit',
    icon: 'User',
  },
  {
    type: 'invoice_created',
    label: 'Factuur aangemaakt',
    description: 'Trigger wanneer een factuur wordt gegenereerd',
    icon: 'FileText',
  },
  {
    type: 'custom_webhook',
    label: 'Custom Webhook',
    description: 'Trigger via externe webhook call',
    icon: 'Globe',
  },
];

// Available actions
export const WORKFLOW_ACTIONS: WorkflowActionType[] = [
  {
    type: 'send_email',
    label: 'Email versturen',
    description: 'Stuur een email naar opgegeven adres',
    icon: 'Mail',
    configFields: [
      { name: 'to', label: 'Aan', type: 'text', placeholder: '{{customer.email}}' },
      { name: 'subject', label: 'Onderwerp', type: 'text', placeholder: 'Update over uw zending' },
      { name: 'body', label: 'Bericht', type: 'textarea', placeholder: 'Beste {{customer.name}}, ...' },
    ],
  },
  {
    type: 'send_sms',
    label: 'SMS versturen',
    description: 'Stuur een SMS naar opgegeven nummer',
    icon: 'MessageSquare',
    configFields: [
      { name: 'to', label: 'Telefoonnummer', type: 'text', placeholder: '{{customer.phone}}' },
      { name: 'message', label: 'Bericht', type: 'textarea', placeholder: 'Uw zending is onderweg...' },
    ],
  },
  {
    type: 'send_webhook',
    label: 'Webhook versturen',
    description: 'Stuur data naar externe webhook (Zapier, Make, etc.)',
    icon: 'Webhook',
    configFields: [
      { name: 'url', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.zapier.com/...' },
      { name: 'method', label: 'Methode', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
    ],
  },
  {
    type: 'update_status',
    label: 'Status updaten',
    description: 'Update de status van een order',
    icon: 'RefreshCw',
    configFields: [
      { name: 'new_status', label: 'Nieuwe status', type: 'select', options: ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd', 'geannuleerd'] },
    ],
  },
  {
    type: 'create_task',
    label: 'Taak aanmaken',
    description: 'Maak een interne taak aan',
    icon: 'CheckSquare',
    configFields: [
      { name: 'title', label: 'Titel', type: 'text', placeholder: 'Volg op: {{order.reference}}' },
      { name: 'assignee', label: 'Toewijzen aan', type: 'text', placeholder: 'planner@bedrijf.nl' },
      { name: 'due_hours', label: 'Deadline (uren)', type: 'number' },
    ],
  },
  {
    type: 'notify_slack',
    label: 'Slack notificatie',
    description: 'Stuur bericht naar Slack kanaal',
    icon: 'Hash',
    configFields: [
      { name: 'webhook_url', label: 'Slack Webhook URL', type: 'text' },
      { name: 'message', label: 'Bericht', type: 'textarea', placeholder: '🚚 Nieuwe order: {{order.reference}}' },
    ],
  },
  {
    type: 'send_whatsapp',
    label: 'WhatsApp versturen',
    description: 'Stuur WhatsApp bericht via template',
    icon: 'Phone',
    configFields: [
      { name: 'to', label: 'Telefoonnummer', type: 'text', placeholder: '{{customer.phone}}' },
      { name: 'template', label: 'Template naam', type: 'text', placeholder: 'delivery_update' },
    ],
  },
];

export const useWorkflowAutomation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all workflows
  const { data: workflows, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_automations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Workflow[];
    },
  });

  // Fetch workflow actions for a specific workflow
  const fetchWorkflowActions = async (workflowId: string) => {
    const { data, error } = await supabase
      .from('workflow_actions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('sequence_order', { ascending: true });
    
    if (error) throw error;
    return data as unknown as WorkflowAction[];
  };

  // Fetch workflow runs
  const { data: recentRuns } = useQuery({
    queryKey: ['workflow-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as unknown as WorkflowRun[];
    },
  });

  // Create workflow mutation
  const createWorkflow = useMutation({
    mutationFn: async (workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'run_count' | 'last_run_at'> & { actions: WorkflowAction[] }) => {
      const { actions, ...workflowData } = workflow;
      
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('workflow_automations')
        .insert(workflowData as any)
        .select()
        .single();
      
      if (workflowError) throw workflowError;
      
      if (actions.length > 0) {
        const actionsWithWorkflowId = actions.map((action, index) => ({
          ...action,
          workflow_id: (newWorkflow as any).id,
          sequence_order: index,
        }));
        
        const { error: actionsError } = await supabase
          .from('workflow_actions')
          .insert(actionsWithWorkflowId as any);
        
        if (actionsError) throw actionsError;
      }
      
      return newWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow aangemaakt', description: 'De automation is succesvol opgeslagen' });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Update workflow mutation
  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Workflow> & { id: string }) => {
      const { data, error } = await supabase
        .from('workflow_automations')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow bijgewerkt' });
    },
  });

  // Toggle workflow active state
  const toggleWorkflow = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('workflow_automations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: variables.is_active ? 'Workflow geactiveerd' : 'Workflow gepauzeerd' });
    },
  });

  // Delete workflow mutation
  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_automations' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow verwijderd' });
    },
  });

  // Manually trigger a workflow
  const triggerWorkflow = async (workflowId: string, testData: Record<string, any> = {}) => {
    const { error } = await supabase
      .from('workflow_runs' as any)
      .insert({
        workflow_id: workflowId,
        trigger_event: testData,
        status: 'pending',
      });
    
    if (error) {
      toast({ title: 'Trigger mislukt', description: error.message, variant: 'destructive' });
      return false;
    }
    
    queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
    toast({ title: 'Workflow getriggerd', description: 'De automation wordt uitgevoerd' });
    return true;
  };

  return {
    workflows,
    isLoadingWorkflows,
    recentRuns,
    fetchWorkflowActions,
    createWorkflow,
    updateWorkflow,
    toggleWorkflow,
    deleteWorkflow,
    triggerWorkflow,
    WORKFLOW_TRIGGERS,
    WORKFLOW_ACTIONS,
  };
};
