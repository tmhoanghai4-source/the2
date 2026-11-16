
import { TheMasterCore } from "@/lib/shadowBrain";
import { MasterNeuralNetworkBridge, getSystemPrompt } from "@/lib/neuralBridge";
import { AIMode, Language, Message, Attachment, GroundingSource, WorkspaceFile } from "@/types";
import { buildAsciiTreeFromPaths } from "@/lib/fileGenerator";

export const brain = new TheMasterCore();
const client = new MasterNeuralNetworkBridge();

export function clearChatMemory() {
  brain.clear();
}

export function getMemoryData() {
  return {
    nodes: brain.getMemoryNodes(),
    stats: brain.getContext().memoryStats
  };
}

export function deleteMemoryNode(id: string) {
  brain.deleteNode(id);
}

export function tagMemoryNode(id: string, tag: string) {
  brain.tagNode(id, tag);
}

export async function* sendMessageStream(
  message: string,
  history: Message[],
  mode: AIMode,
  language: Language,
  attachments: Attachment[] = [],
  signal?: AbortSignal,
  isEcoMode: boolean = false,
  model: string = 'gemini-3.8-flash',
  isApiOnline: boolean = true,
  username?: string,
  workspaceFiles: WorkspaceFile[] = [],
  workspaceName: string = 'project'
) {
  brain.addMessage("user", message);
  const context = brain.getContext();

  // --- COGNITIVE GROUNDING (Update 4.5: Context Injection) ---
  const localMatch = brain.findHighlyRelevantMatch(message);
  let enhancedContext = context.summary;

  // Identify if User is Owner TMkingreal / king
  if (username) {
    const norm = username.toLowerCase();
    if (norm.includes("kingreal") || norm.includes("tm_") || norm === "king") {
      enhancedContext += `\n\n[XÁC THỰC CHỦ SỞ HỮU]: Người dùng đang trò chuyện là TMkingreal (king), người sáng tạo ra TheMaster.`;
    }
  }

  let isUsingLocal = false;
  let currentIQ = brain.getCognitiveLevel();
  if (localMatch && localMatch.score > 0.6) {
    isUsingLocal = true;
    enhancedContext += `\n[DỮ LIỆU QUAN TRỌNG TỪ BỘ NHỚ CỤC BỘ]: "${localMatch.content}"\n(Hãy ưu tiên sử dụng thông tin này để TRẢ LỜI NGƯỜI DÙNG. Tuyệt đối biến tấu văn phong, không copy nguyên bản).`;
  }

  // --- MASTER OFFLOW: PRIMARY RETRIEVAL (Update 16.5: Hybrid Logic) ---
  const isValidOffline = !isApiOnline;
  const isCodeMissingBlock = localMatch?.content.includes('code') && !localMatch?.content.includes('```');
  
  if (isValidOffline && localMatch && !isCodeMissingBlock && attachments.length === 0) {
    const logs = [
      { message: !isApiOnline ? `[SYSTEM: OFFLINE_MODE] Cloud neural connection is currently disabled.` : `[MASTER-RETRIEVAL] High confidence exact match found.`, type: 'system' },
      { message: `Nguồn: TheMaster Core | Method: ${localMatch.method?.toUpperCase() || 'CORE'}`, type: 'neural' }
    ];

    if (localMatch.score > 2000) {
      logs.push({ message: `KEYWORD ANCHOR: Detected high-value topic connection.`, type: 'info' } as any);
    }
    
    yield { text: localMatch.content, isUsedLocal: true, terminalLogs: logs as any };
    
    brain.addMessage("assistant", localMatch.content);
    
    yield { 
      text: "", 
      isLearned: false, 
      isUsedLocal: true, 
      terminalLogs: [] 
    };
    return;
  }

  // Collect any previously uploaded images in history so AI can embed them in docx/pptx across turns
  const historyImages: { id: string; name: string }[] = [];
  for (const h of history) {
    if (h.attachments) {
      for (const att of h.attachments) {
        if (att.type === 'image' && att.data) {
          historyImages.push({ id: att.id, name: att.name });
        }
      }
    }
  }
  if (historyImages.length > 0) {
    enhancedContext += `\n[ẢNH ĐÃ ĐÍNH KÈM TRONG HỘI THOẠI (dùng để chèn vào DOCX/PPTX nếu cần)]:\n` +
      historyImages.map((img, i) => `- Ảnh #${i + 1}: "${img.name}" -> IMAGE_ID: attach://${img.id}`).join('\n');
  }

  if (workspaceFiles && workspaceFiles.length > 0) {
    const projectTree = buildAsciiTreeFromPaths(workspaceFiles.map(f => f.path), workspaceName || 'project');
    const assetItems = workspaceFiles.filter(f => f.dataUrl || f.mimeType?.startsWith('image/'));
    const textFiles = workspaceFiles.filter(f => !f.isBinary && typeof f.content === 'string');

    enhancedContext += `\n\n[THƯ MỤC DỰ ÁN WORKSPACE HIỆN TẠI: ${workspaceName || 'project'} (${workspaceFiles.length} tệp)]:\n${projectTree}`;
    if (assetItems.length > 0) {
      enhancedContext += `\n\n[ẢNH TRONG THƯ MỤC ASSET (dùng đường dẫn này trong code HTML/React hoặc DOCX/PPTX)]:\n` +
        assetItems.map(a => `- ${a.path}`).join('\n');
    }

    let charBudget = 42000;
    const priorityScore = (p: string) => {
      const l = p.toLowerCase();
      if (l === 'index.html' || l === 'package.json') return 0;
      if (/^(src\/)?(main|app)\.(tsx|jsx|ts|js|py)$/i.test(l)) return 1;
      return 2;
    };
    const sortedCode = [...textFiles].sort((a, b) => priorityScore(a.path) - priorityScore(b.path));
    enhancedContext += `\n\n[NỘI DUNG MÃ NGUỒN TRONG THƯ MỤC DỰ ÁN]:\n`;
    for (const file of sortedCode) {
      const snippet = (file.content || '').slice(0, 12000);
      if (charBudget - snippet.length < 0 && enhancedContext.length > 45000) break;
      charBudget -= snippet.length;
      enhancedContext += `\n--- FILE: ${file.path} ---\n\`\`\`\n${snippet}\n\`\`\`\n`;
    }
    enhancedContext += `\n(Khi sửa đổi hoặc tạo file mới cho dự án trên, luôn đặt FILENAME: duong_dan/file.ext trước khối code hoàn chỉnh.)`;
  }

  const systemInstruction = getSystemPrompt(mode, language, context.profile, enhancedContext, isEcoMode, currentIQ);

  const userParts: any[] = [{ text: message }];
  attachments.forEach(att => {
    // Send as native inline multimodal data if it is an image, PDF or audio supported by Gemini
    const isNativeMultimodal = 
      att.type === 'image' || 
      att.mimeType === 'application/pdf' || 
      att.mimeType?.startsWith('audio/');

    if (isNativeMultimodal) {
      userParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      
      // If it also has text extracted (sometimes user uploads PDF that we can also attach metadata), we log it
      if (att.textContent) {
        userParts[0].text += `\n\n[Tệp Tài Liệu: ${att.name}]\n${att.textContent}`;
      } else if (att.type === 'image') {
        userParts[0].text += `\n\n[Đã đính kèm ảnh: "${att.name}" | IMAGE_ID để chèn vào DOCX/PPTX: attach://${att.id}]`;
      } else {
        userParts[0].text += `\n\n[Đã đính kèm tệp phương tiện đa phương thức: ${att.name}]`;
      }
    } else {
      // For source code, text files and other document configurations
      userParts[0].text += `\n\n--- DỮ LIỆU TỆP ĐÍNH KÈM SẴN CÓ ---`;
      userParts[0].text += `\n- Tên tệp: ${att.name}`;
      userParts[0].text += `\n- Loại nội dung: ${att.mimeType || 'unknown'}`;
      userParts[0].text += `\n- Kích thước: ${(att.size / 1024).toFixed(1)} KB`;
      if (att.textContent) {
        userParts[0].text += `\n- Nội dung tệp thực tế:\n\`\`\`\n${att.textContent}\n\`\`\``;
      }
      userParts[0].text += `\n---------------------------------------`;
    }
  });

  // Context Pruning (exclude the just-added trailing user message to avoid duplication)
  const historyLimit = isEcoMode ? -4 : -20;
  const priorHistory = context.recent.slice(historyLimit, -1);

  const contents: any[] = [];
  for (const msg of priorHistory) {
    const role = msg.role === 'user' ? 'user' : 'model';
    const text = (msg.content || '').trim();
    if (!text) continue;
    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  const prevLast = contents[contents.length - 1];
  if (prevLast && prevLast.role === 'user' && attachments.length === 0) {
    prevLast.parts[0].text += `\n\n${userParts[0].text}`;
  } else {
    contents.push({
      role: 'user',
      parts: userParts
    });
  }

  let fullAssistantResponse = "";
  const logs: any[] = [];
  try {
    const config: any = { 
      systemInstruction
    };
    
    const stream = client.generateStream(contents, config, mode, signal, model, language);

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      
      const { text, thought, sources } = chunk;
      fullAssistantResponse += text;

      yield { 
        text, 
        thought, 
        sources,
        terminalLogs: [] 
      };
    }

    logs.length = 0; 
    if (isUsingLocal && localMatch) {
      logs.push({ message: `[TRUY XUẤT THÀNH CÔNG] Dữ liệu từ TheMaster Core (Score: ${Math.round(localMatch.score)})`, type: 'system' });
      if (localMatch.score > 1000) logs.push({ message: `TOPIC DETECTED: Importance Level ${localMatch.isCritical ? 'CRITICAL' : 'HIGH'}`, type: 'neural' });
      logs.push({ message: `Chiến lược Metamorphosis v2.0 hoạt động...`, type: 'logic' });
      logs.push({ message: `Phương pháp: ${localMatch.method?.toUpperCase() || 'VECTOR'}`, type: 'neural' });
    } else {
      logs.push({ message: `[SOURCE: CLOUD_API] Data stream via TheMaster.`, type: 'info' });
    }

    let wasLearned = false;
    if (fullAssistantResponse.trim()) {
      brain.addMessage("assistant", fullAssistantResponse);
      wasLearned = brain.learnFromAssistant(fullAssistantResponse, message);
      if (wasLearned) {
        logs.push({ message: `[ĐÃ HỌC XONG] Tri thức mới đã được bóc tách và nạp vào neuron. Chỉ số IQ đã tăng.`, type: 'logic' });
      }
    }

    yield { 
      text: "", 
      isLearned: wasLearned,
      isUsedLocal: isUsingLocal,
      terminalLogs: logs
    };

  } catch (error: any) {
    if (error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429 || error.message?.includes('429')) {
      logs.push({ message: `[QUOTA EXCEEDED] API limit reached.`, type: 'error' as any });
      const overloadMessage = `⚠️ **AI Đang Quá Tải (Quota Exceeded)**\n\nHệ thống hiện đang gặp giới hạn tải tối đa từ máy chủ (Rate Limit). Vui lòng thử lại sau ít phút.`;
      yield { text: overloadMessage, terminalLogs: logs as any };
      return;
    }
    
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      const localMatch = brain.findHighlyRelevantMatch(message);
      const connectivityFallback = localMatch 
        ? `[NETWORK OFFLINE]\n\n${localMatch.content}\n\n*(Mất kết nối API. Đã truy xuất thành công từ bộ nhớ đệm).*`
        : `[THEMASTER CRITICAL] Không thể kết nối tới Cloud API. Vui lòng kiểm tra internet.`;
      yield { text: connectivityFallback, terminalLogs: [{ message: "ERR_CONNECTION_FAILED: API unreachable.", type: 'error' }] as any };
      return;
    }

    console.error("TheMaster Core Fatal Error:", error);
    throw error;
  }
}

/**
 * Sends a message stream to the AI and processes memory updates.
 * 
 * @example
 * // Basic Chat
 * for await (const chunk of sendMessageStream("Hello", [], AIMode.CHAT, Language.VIETNAMESE)) {
 *   console.log(chunk.text);
 * }
 * 
 * @example
 * // Research mode with English output
 * for await (const chunk of sendMessageStream("Analyze this", [], AIMode.RESEARCH, Language.ENGLISH)) {
 *   if (chunk.sources) console.log(chunk.sources);
 * }
 * 
 * @example 
 * // Programming aid
 * for await (const chunk of sendMessageStream("Write a python script", [], AIMode.CODE, Language.ENGLISH)) {
 *   // Response will contain syntax-highlighted code blocks
 * }
 */
export async function translateMessage(content: string, targetLanguage: Language): Promise<string> {
  const systemInstruction = "TheMaster Translation Core. Precise. Professional.";
  const contents = [{
    role: 'user',
    parts: [{ text: `Translate following content to ${targetLanguage}. Maintain technical formatting:\n\n${content}` }]
  }];

  try {
    const response = await client.generateResponse(contents, { systemInstruction }, AIMode.FAST);
    return response.text || content;
  } catch {
    return content;
  }
}
