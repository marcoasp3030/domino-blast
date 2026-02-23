export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  steps: {
    id: string;
    stepType: string;
    config: Record<string, any>;
    positionX: number;
    positionY: number;
  }[];
  edges: {
    sourceId: string;
    targetId: string;
    sourceHandle: string;
  }[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "welcome",
    name: "Boas-vindas",
    description: "Sequência de emails de boas-vindas para novos contatos adicionados a uma lista",
    icon: "👋",
    triggerType: "contact_added_to_list",
    triggerConfig: {},
    steps: [
      {
        id: "step-welcome-1",
        stepType: "send_email",
        config: { subject: "Bem-vindo! 🎉", templateName: "Email de boas-vindas" },
        positionX: 250,
        positionY: 150,
      },
      {
        id: "step-welcome-2",
        stepType: "delay",
        config: { delayValue: 2, delayUnit: "days" },
        positionX: 250,
        positionY: 280,
      },
      {
        id: "step-welcome-3",
        stepType: "send_email",
        config: { subject: "Conheça nossos recursos", templateName: "Email de onboarding" },
        positionX: 250,
        positionY: 410,
      },
      {
        id: "step-welcome-4",
        stepType: "add_tag",
        config: { tagName: "onboarded" },
        positionX: 250,
        positionY: 540,
      },
    ],
    edges: [
      { sourceId: "trigger", targetId: "step-welcome-1", sourceHandle: "default" },
      { sourceId: "step-welcome-1", targetId: "step-welcome-2", sourceHandle: "default" },
      { sourceId: "step-welcome-2", targetId: "step-welcome-3", sourceHandle: "default" },
      { sourceId: "step-welcome-3", targetId: "step-welcome-4", sourceHandle: "default" },
    ],
  },
  {
    id: "re-engagement",
    name: "Reengajamento",
    description: "Reengaje contatos inativos com uma sequência de emails e verificação de abertura",
    icon: "🔄",
    triggerType: "tag_added",
    triggerConfig: {},
    steps: [
      {
        id: "step-re-1",
        stepType: "send_email",
        config: { subject: "Sentimos sua falta! 💌", templateName: "Email de reengajamento" },
        positionX: 250,
        positionY: 150,
      },
      {
        id: "step-re-2",
        stepType: "delay",
        config: { delayValue: 3, delayUnit: "days" },
        positionX: 250,
        positionY: 280,
      },
      {
        id: "step-re-3",
        stepType: "condition",
        config: { conditionType: "has_opened", campaignRef: "previous" },
        positionX: 250,
        positionY: 410,
      },
      {
        id: "step-re-4",
        stepType: "send_email",
        config: { subject: "Última chance! Oferta especial 🎁", templateName: "Email de oferta" },
        positionX: 100,
        positionY: 560,
      },
      {
        id: "step-re-5",
        stepType: "remove_tag",
        config: { tagName: "inativo" },
        positionX: 400,
        positionY: 560,
      },
    ],
    edges: [
      { sourceId: "trigger", targetId: "step-re-1", sourceHandle: "default" },
      { sourceId: "step-re-1", targetId: "step-re-2", sourceHandle: "default" },
      { sourceId: "step-re-2", targetId: "step-re-3", sourceHandle: "default" },
      { sourceId: "step-re-3", targetId: "step-re-4", sourceHandle: "no" },
      { sourceId: "step-re-3", targetId: "step-re-5", sourceHandle: "yes" },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding",
    description: "Sequência educativa de 5 dias para ensinar os recursos do produto ao novo usuário",
    icon: "🚀",
    triggerType: "contact_added_to_list",
    triggerConfig: {},
    steps: [
      {
        id: "step-onb-1",
        stepType: "send_email",
        config: { subject: "Dia 1: Primeiros passos", templateName: "Onboarding Dia 1" },
        positionX: 250,
        positionY: 150,
      },
      {
        id: "step-onb-2",
        stepType: "delay",
        config: { delayValue: 1, delayUnit: "days" },
        positionX: 250,
        positionY: 280,
      },
      {
        id: "step-onb-3",
        stepType: "send_email",
        config: { subject: "Dia 2: Recursos avançados", templateName: "Onboarding Dia 2" },
        positionX: 250,
        positionY: 410,
      },
      {
        id: "step-onb-4",
        stepType: "delay",
        config: { delayValue: 2, delayUnit: "days" },
        positionX: 250,
        positionY: 540,
      },
      {
        id: "step-onb-5",
        stepType: "send_email",
        config: { subject: "Dia 4: Dicas de produtividade", templateName: "Onboarding Dia 4" },
        positionX: 250,
        positionY: 670,
      },
      {
        id: "step-onb-6",
        stepType: "add_tag",
        config: { tagName: "onboarding-completo" },
        positionX: 250,
        positionY: 800,
      },
    ],
    edges: [
      { sourceId: "trigger", targetId: "step-onb-1", sourceHandle: "default" },
      { sourceId: "step-onb-1", targetId: "step-onb-2", sourceHandle: "default" },
      { sourceId: "step-onb-2", targetId: "step-onb-3", sourceHandle: "default" },
      { sourceId: "step-onb-3", targetId: "step-onb-4", sourceHandle: "default" },
      { sourceId: "step-onb-4", targetId: "step-onb-5", sourceHandle: "default" },
      { sourceId: "step-onb-5", targetId: "step-onb-6", sourceHandle: "default" },
    ],
  },
];
