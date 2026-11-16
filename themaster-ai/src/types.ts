
export enum AIMode {
  CHAT = 'Chat',
  CODE = 'Code',
  APP_PREVIEW = 'AppRunner',
  DEEP = 'Deep',
  FAST = 'Fast',
  CREATIVE = 'Creative',
  MATH = 'Math',
  TRADING = 'Trading',
  RESEARCH = 'Research'
}

export enum Theme {
  DARK = 'Dark',
  LIGHT = 'Light',
  MATRIX = 'Matrix',
  CYBERPUNK = 'Cyberpunk',
  GALAXY = 'Galaxy',
  PIXEL = 'Pixel'
}

export enum Language {
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  GERMAN = 'German',
  CHINESE = 'Chinese',
  JAPANESE = 'Japanese',
  VIETNAMESE = 'Vietnamese'
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  mimeType: string;
  data: string; // Base64
  size: number;
  textContent?: string;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  mimeType: string;
  size: number;
  content?: string;
  dataUrl?: string;
  isBinary?: boolean;
}

export interface PromptBuilderData {
  role: string;
  context: string;
  task: string;
  constraints: string;
  format: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  attachments?: Attachment[];
  groundingSources?: GroundingSource[];
  suggestedQuestions?: string[];
  timestamp: number;
  countdownEnd?: number; // Timestamp when countdown ends
  isLearned?: boolean;
  isUsedLocal?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface KnowledgeNode {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'critical';
  content: string;
  originalRequest?: string;
  tags: string[];
  timestamp: number;
  confidence: number;
  isCompressed?: boolean;
  relationNodes?: string[];
  sourceType?: 'autonomous' | 'manual_ans' | 'manual_question' | 'manual_instruction' | 'qa_rule'; 
  question?: string;
  answer?: string;
}

export interface TerminalLog {
  id: string;
  type: 'info' | 'warn' | 'error' | 'neural' | 'system' | 'logic' | 'success';
  message: string;
  timestamp: number;
}

export interface SearchMatch {
  content: string;
  score: number;
  isCritical: boolean;
  iqLevel: number;
  method?: 'neural' | 'vector' | 'exact';
}

export interface MemoryStats {
  totalNodes: number;
  difficultyDist: {
    easy: number;
    medium: number;
    hard: number;
    critical: number;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  folderId?: string;
  mode: AIMode;
  language: Language;
  lastTimestamp: number;
}

export interface TranslationStrings {
  placeholder: string;
  commandPlaceholder: string;
  send: string;
  thinking: string;
  newChat: string;
  history: string;
  settings: string;
  modes: { [key in AIMode]: string };
  languages: { [key in Language]: string };
  themes: { [key in Theme]: string };
  attachmentAdded: string;
  copy: string;
  copied: string;
  workspaces: string;
  newFolderPrompt: string;
  recentChats: string;
  roadmap: string;
  expectedUpdate: string;
  thoughtProcess: string;
  thinkingDone: string;
  renameChatPrompt: string;
  renameFolderPrompt: string;
  serverOverload: string;
  serverOverloadDetail: string;
  mathResult: string;
  enterpriseIntelligence: string;
  helpful: string;
  notHelpful: string;
  coreConnectionFailed: string;
  roadmapTitle: string;
  voteForFeatures: string;
  vote: string;
  votes: string;
  voteNote: string;
  ask: string;
  uploadFile: string;
  tools: string;
  specializedTools: string;
  promptBuilder: string;
  promptBuilderDesc: string;
  codeDev: string;
  mathSci: string;
  marketAnalysis: string;
  upgradePro: string;
  ecoMode: string;
  modeFastDesc: string;
  modeDeepDesc: string;
  modeCreativeDesc: string;
  modeResearchDesc: string;
  modeChatDesc: string;
  stopGenerating: string;
  analyzingDeep: string;
  processingData: string;
  processing: string;
  verifiedSources: string;
  customTheme: string;
  ambientSound: string;
  addKnowledge: string;
  knowledgeType: string;
  knowledgeContent: string;
  inject: string;
  conversationsTab: string;
  knowledgeTab: string;
  searchPlaceholder: string;
  clearAll: string;
  uncategorized: string;
  loggedInStatus: string;
  logout: string;
  collapseSidebar: string;
  openSidebar: string;
  authShortcutTooltip: string;
  attachAndCreate: string;
  attachImage: string;
  attachFile: string;
  attachFolder: string;
  drawTree: string;
  createWord: string;
  createPptx: string;
  createZip: string;
  templateDrawTree: string;
  templateCreateWord: string;
  templateCreatePptx: string;
  templateCreateZip: string;
  micListening: string;
  micTranscribing: string;
  micPermissionError: string;
  micUnsupportedError: string;
  micTranscribeError: string;
  clearInput: string;
  readAloudEnable: string;
  readAloudEnabled: string;
  readAloudStop: string;
  micStart: string;
  micStop: string;
  quotePrefix: string;
  cancel: string;
  blockedTitle: string;
  blockedDefault: string;
  downloadZipPrefix: string;
  filesUnit: string;
  sourcesTitle: string;
  quoteAction: string;
  copyAction: string;
  treeTitle: string;
  treeTabFolder: string;
  copiedShort: string;
  copyShort: string;
  downloadShort: string;
  downloadFileTooltip: string;
  slidePreview: string;
  slidesUnit: string;
  dropTitle: string;
  dropSubtitle: string;
  defaultFolderWork: string;
  defaultFolderStudy: string;
  defaultFolderPersonal: string;
  selectMode: string;
  selectLanguage: string;
  selectModel: string;
  modelUpgradedHint: string;
  chipCode: string;
  chipCreative: string;
  chipMath: string;
  chipTranslate: string;
  chipTranslatePrompt: string;
  promptBuilderRole: string;
  promptBuilderRolePh: string;
  promptBuilderContext: string;
  promptBuilderContextPh: string;
  promptBuilderTask: string;
  promptBuilderTaskPh: string;
  promptBuilderConstraints: string;
  promptBuilderConstraintsPh: string;
  promptBuilderFormat: string;
  promptBuilderFormatPh: string;
  promptBuilderSubmit: string;
  authWelcome: string;
  authJoin: string;
  authSubtitleLogin: string;
  authSubtitleSignup: string;
  authBackGuest: string;
  authUsernamePh: string;
  authPasswordPh: string;
  authLoginBtn: string;
  authSignupBtn: string;
  authNoAccount: string;
  authHaveAccount: string;
  authSwitchSignup: string;
  authSwitchLogin: string;
  authFailed: string;
  runCode: string;
  runningCode: string;
  previewCode: string;
  outputLabel: string;
  clearOutput: string;
  customTreeBtn: string;
  customTreeTitle: string;
  customTreeRootPh: string;
  customTreePathsPh: string;
  customTreeInsertChat: string;
  customTreeSendAi: string;
  workspaceBtn: string;
  workspaceTitle: string;
  workspaceLoadFolder: string;
  workspaceAddAsset: string;
  workspaceRunApp: string;
  workspaceClear: string;
  workspaceEmpty: string;
  workspaceFilesTab: string;
  workspaceAssetsTab: string;
  workspaceApplyCode: string;
  workspaceApplied: string;
  workspaceApplyAll: string;
  workspaceDownloadDoc: string;
  workspaceWordDoc: string;
  workspacePptxDoc: string;
  workspacePdfDoc: string;
  appRunnerReload: string;
  appRunnerDesktop: string;
  appRunnerMobile: string;
  appRunnerConsole: string;
  appRunnerNoEntry: string;
  assetCopyPath: string;
  assetCopiedPath: string;
  chatJournalBtn: string;
  chatJournalTitle: string;
  chatJournalEmpty: string;
  chatJournalSearchPh: string;
  chatJournalRestore: string;
  chatJournalExportMd: string;
  chatJournalExportJson: string;
  chatJournalClear: string;
  chatJournalMessagesUnit: string;
  nextStepSuggestionsTitle: string;
  workspaceUpdateFileBtn: string;
  workspacePickTargetFile: string;
  workspaceSaveDisk: string;
  workspaceSavedDisk: string;
  workspaceGalleryTitle: string;
  workspaceGalleryEmpty: string;
  updates: { [key: string]: { title: string; desc: string } };
}

export type Translations = {
  [key in Language]: TranslationStrings;
};
