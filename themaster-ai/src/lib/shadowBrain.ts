import { KnowledgeNode, MemoryStats, TerminalLog } from "../types";

export class TheMasterCore {
  private history: { role: string, content: string }[] = [];
  private memoryNodes: KnowledgeNode[] = [];
  public terminalLogs: TerminalLog[] = [];
  private currentSummary: string = "";
  private keywordIndex: Map<string, string[]> = new Map();
  private cognitiveLevel: number = 1;
  private isSearching: boolean = false;
  private userId: string | null = null;
  private acronymMap: Map<string, string> = new Map([
    ['vllt', 'vật lý lượng tử'],
    ['vllt học', 'vật lý lượng tử'],
    ['ai', 'trí tuệ nhân tạo'],
    ['llm', 'mô hình ngôn ngữ lớn'],
    ['tm', 'themaster'],
    ['kthuc', 'kiến thức'],
    ['t-ai', 'themaster'],
    ['vlyk', 'vật lý'],
    ['qt', 'quan trọng'],
    ['cntt', 'công nghệ thông tin'],
    ['khmt', 'khoa học máy tính'],
    ['httt', 'hệ thống thông tin'],
    ['attt', 'an toàn thông tin'],
    ['tkdh', 'thiết kế đồ họa'],
    ['ptr', 'phát triển'],
    ['lập trình', 'lập trình'],
    ['lt', 'lập trình'],
    ['cn', 'công nghệ'],
    ['th', 'trường hợp'],
    ['vd', 'ví dụ'],
    ['bt', 'bình thường'],
    ['ks', 'khảo sát'],
    ['ng', 'người'],
    ['dc', 'được'],
    ['ko', 'không'],
    ['k', 'không'],
    ['m', 'mình'],
    ['t', 'tôi'],
    ['u', 'bạn'],
    ['b', 'bạn']
  ]);

  constructor() {
    this.memoryNodes = [];
    this.loadFromStorage();
    this.updateCognitiveLevel();
    this.periodicMaintenance();
  }

  getMemoryNodes(): KnowledgeNode[] {
    return this.memoryNodes;
  }

  setUserId(uid: string) {
    if (this.userId !== uid) {
      this.userId = uid;
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const userPrefix = this.userId || 'guest';
      const saved = localStorage.getItem(`tm_brain_nodes_v2_${userPrefix}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.memoryNodes = parsed;
          this.keywordIndex.clear();
          this.memoryNodes.forEach(n => this.indexNode(n));
        }
      } else {
        this.memoryNodes = [];
        this.keywordIndex.clear();
      }
    } catch (e) {
      console.error("Failed to load brain storage", e);
    }
  }

  private async saveToStorage() {
    try {
      const userPrefix = this.userId || 'guest';
      localStorage.setItem(`tm_brain_nodes_v2_${userPrefix}`, JSON.stringify(this.memoryNodes));
    } catch (e) {
      console.error("Failed to save brain storage", e);
    }
  }

  private periodicMaintenance() {
    setInterval(() => {
      this.garbageCollection();
      this.compressOldKnowledge();
    }, 300000);
  }

  private updateCognitiveLevel() {
    this.cognitiveLevel = Math.max(1, Math.floor(this.memoryNodes.length / 40) + 1);
  }

  getLearningRatio(): number {
    return (this.memoryNodes.length % 40) / 40 * 100;
  }

  private indexNode(node: KnowledgeNode) {
    const tokens = (node.originalRequest || node.content).toLowerCase()
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
    
    tokens.forEach(token => {
      const existing = this.keywordIndex.get(token) || [];
      if (!existing.includes(node.id)) {
        this.keywordIndex.set(token, [...existing, node.id]);
      }
    });
  }

  private compressOldKnowledge() {
    const compressionThreshold = 30;
    if (this.memoryNodes.length > compressionThreshold) {
      this.memoryNodes.forEach((node, index) => {
        if (index > compressionThreshold && node.content.length > 300 && !node.isCompressed) {
          node.content = node.content.slice(0, 250) + "... [Compressed for Performance]";
          node.isCompressed = true;
        }
      });
    }
  }

  private garbageCollection() {
    const maxNodes = 150;
    if (this.memoryNodes.length > maxNodes) {
      this.memoryNodes = this.memoryNodes
        .sort((a, b) => {
          const scoreA = (a.difficulty === 'critical' ? 500 : 10) + a.confidence * 100;
          const scoreB = (b.difficulty === 'critical' ? 500 : 10) + b.confidence * 100;
          return scoreB - scoreA;
        })
        .slice(0, maxNodes);
    }
  }

  getCognitiveLevel() {
    return this.cognitiveLevel;
  }

  clear() {
    this.history = [];
    this.memoryNodes = [];
    this.currentSummary = "";
    this.saveToStorage();
  }

  addMessage(role: string, content: string) {
    this.history.push({ role, content });
    
    if (role === 'assistant') {
      const lastUserMsg = this.history.filter(m => m.role === 'user').pop()?.content;
      if (lastUserMsg && content.length > 30) {
        this.learnFromAssistant(content, lastUserMsg);
      }
    }
  }

  addTerminalLog(message: string, type: TerminalLog['type'] = 'system') {
    this.terminalLogs.push({
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    });
    if (this.terminalLogs.length > 50) this.terminalLogs.shift();
  }

  deleteNode(id: string) {
    this.memoryNodes = this.memoryNodes.filter(n => n.id !== id);
  }

  resetKnowledge() {
    this.memoryNodes = [];
    this.saveToStorage();
  }

  pruneDuplicates() {
    const beforeCount = this.memoryNodes.length;
    const uniqueMap = new Map<string, KnowledgeNode>();
    
    this.memoryNodes.forEach(node => {
      const key = node.content.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, node);
      } else {
        const existing = uniqueMap.get(key)!;
        if (node.tags.length > existing.tags.length || node.sourceType === 'qa_rule') {
          uniqueMap.set(key, node);
        }
      }
    });

    this.memoryNodes = Array.from(uniqueMap.values());
    this.saveToStorage();
    return beforeCount - this.memoryNodes.length;
  }

  tagNode(id: string, tag: string) {
    const node = this.memoryNodes.find(n => n.id === id);
    if (node && !node.tags.includes(tag)) {
      node.tags.push(tag);
    }
  }

  private findRelatedNodes(content: string, currentId: string): string[] {
    return this.memoryNodes
      .filter(n => n.id !== currentId)
      .map(n => ({ id: n.id, score: this.calculateSimilarity(n.content.slice(0, 100), content.slice(0, 100)) }))
      .filter(entry => entry.score > 0.6)
      .slice(0, 3)
      .map(entry => entry.id);
  }

  learnFromAssistant(content: string, originalRequest?: string, categoryOverride?: string): boolean {
    const isChat = categoryOverride === 'Chat' || (this.detectCategory(content) === 'Chat' && !content.includes('```'));
    const isInformative = content.length > 80 || content.includes('**') || content.includes('```');

    if (content.length < 30 && isChat) return false; 

    const difficulty = this.analyzeDifficulty(content);
    const category = categoryOverride || this.detectCategory(content);
    
    const conflictNode = this.memoryNodes.find(n => 
      this.calculateSimilarity(n.content.slice(0, 100), content.slice(0, 100)) > 0.85
    );

    let confidence = 0.8;
    if (difficulty === 'critical') confidence = 0.95;

    if (conflictNode) {
      if (content.length >= conflictNode.content.length * 0.8) {
        conflictNode.content = content;
        conflictNode.confidence = Math.min(1.0, confidence + 0.1);
        conflictNode.timestamp = Date.now();
        conflictNode.category = category;
        this.saveToStorage();
        return true;
      }
      return false;
    }

    const discoveredTags = ['autonomous'];
    if (originalRequest) {
        const words = originalRequest.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        discoveredTags.push(...words.slice(0, 3));
    }
    
    if (isInformative || difficulty !== 'easy' || categoryOverride) {
      const newNode: KnowledgeNode = {
        id: `C${Date.now()}`,
        category,
        difficulty,
        content: content,
        originalRequest,
        question: originalRequest,
        answer: content,
        sourceType: originalRequest ? 'qa_rule' : 'autonomous',
        tags: Array.from(new Set(discoveredTags)),
        timestamp: Date.now(),
        confidence,
        relationNodes: []
      };

      this.memoryNodes.push(newNode);
      this.indexNode(newNode);
      this.linkRelatedNodes(newNode);
      this.updateCognitiveLevel();
      this.saveToStorage();

      this.currentSummary += `\n[LEARNED:${newNode.id} | ${category}]`;
      return true;
    }
    return false;
  }

  private calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - this.editDistance(longer, shorter)) / longer.length;
  }

  private editDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private normalizeQuery(query: string): string {
    let normalized = query.toLowerCase();
    this.acronymMap.forEach((full, acronym) => {
      const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    });
    return normalized;
  }

  findHighlyRelevantMatch(query: string): { content: string, score: number, isCritical: boolean, iqLevel: number, method?: 'neural' | 'vector' | 'exact' } | null {
    this.isSearching = true;
    const lowerQuery = this.normalizeQuery(query);
    const queryTokens = lowerQuery.split(/\s+/).filter(t => t.length > 2);
    
    const criticalTopics = this.memoryNodes
      .filter(n => n.difficulty === 'critical' || n.difficulty === 'hard')
      .flatMap(n => n.tags)
      .filter(t => t !== 'autonomous' && t !== 'qa_rule');
    
    const detectedTopics = criticalTopics.filter(t => lowerQuery.includes(t.toLowerCase()));

    try {
      const candidates = new Map<string, { node: KnowledgeNode, score: number }>();

      queryTokens.forEach(token => {
        const ids = this.keywordIndex.get(token);
        if (ids) {
          ids.forEach(id => {
            const node = this.memoryNodes.find(n => n.id === id);
            if (node) {
              const current = candidates.get(id) || { node, score: 0 };
              current.score += 50; 
              candidates.set(id, current);
            }
          });
        }
      });

      this.memoryNodes.forEach(node => {
        const nodeText = node.content.toLowerCase();
        const requestText = (node.originalRequest || "").toLowerCase();
        let vectorScore = 0;
        
        if (nodeText.includes(lowerQuery)) vectorScore += 120;
        if (requestText && requestText.includes(lowerQuery)) vectorScore += 180;
        
        if (detectedTopics.some(t => nodeText.includes(t.toLowerCase()) || (node.tags && node.tags.includes(t)))) {
           vectorScore += 200;
        }

        const requestSim = requestText ? this.calculateSimilarity(requestText, lowerQuery) : 0;
        if (requestSim > 0.75) vectorScore += (requestSim * 250);

        if (vectorScore > 0) {
          const current = candidates.get(node.id) || { node, score: 0 };
          current.score += vectorScore;
          candidates.set(node.id, current);
        }
      });

      const finalResults = Array.from(candidates.values())
        .map(entry => {
          const commonGreetings = ['chào', 'hi', 'hello', 'xin chào', 'hey', 'alo', 'ê'];
          const isGreeting = commonGreetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' '));

          if (entry.node.sourceType === 'qa_rule' && entry.node.question && !isGreeting) {
            const qLower = entry.node.question.toLowerCase();
            if (lowerQuery.includes(qLower) || qLower.includes(lowerQuery)) {
                entry.score += 8000;
            }
            
            const qWords = entry.node.question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
            const qIntersect = queryWords.filter(w => qWords.includes(w));
            const qaMatchRatio = qIntersect.length / (qWords.length || 1);
            if (qaMatchRatio > 0.6) {
                entry.score += 6000;
            }
          }

          const sim = this.calculateSimilarity(entry.node.content.toLowerCase(), lowerQuery);
          
          const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
          const contentWords = entry.node.content.toLowerCase().split(/\s+/);
          const intersection = queryWords.filter(w => contentWords.includes(w));
          const keywordBonus = (intersection.length / (queryWords.length || 1)) * 300;

          entry.score += sim * 150; 
          entry.score += keywordBonus;
          entry.score += entry.node.confidence * 50;

          if (entry.node.difficulty === 'critical') entry.score *= 1.2;

          return entry;
        })
        .filter(e => e.score >= 150) 
        .sort((a, b) => b.score - a.score);

      if (finalResults.length > 0) {
        const actualBest = finalResults[0];

        if (actualBest.node.sourceType === 'qa_rule' && actualBest.node.answer && actualBest.score >= 5000) {
            return {
                content: actualBest.node.answer,
                score: actualBest.score,
                isCritical: actualBest.node.difficulty === 'critical',
                iqLevel: 200,
                method: 'exact'
            };
        }
        
        const prefixes = [
          "Mình đã hiểu ý Bạn rồi, đây là thông tin Bạn cần nhé:",
          "Từ kiến thức hai đứa mình đã lưu trữ, đây là lời giải đáp tốt nhất:",
          "Theo như những gì chúng ta đã thảo luận và lưu lại, đây là phản hồi:",
          "Mình xin phép được tóm lược lại thông tin quan trọng này gửi Bạn:"
        ];
        
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        
        const variations = [
          "\n\n*(Thông tin này được lấy từ bộ nhớ chia sẻ của hai chúng mình)*",
          "\n\n*(Đây chính là những gì Bạn đã chỉ dẫn cho mình trước đó)*",
          "\n\n*(Dữ liệu đã được mình hệ thống lại thật dễ hiểu nhất)*"
        ];
        const randomVar = variations[Math.floor(Math.random() * variations.length)];
        
        return {
          content: `${randomPrefix}\n\n${actualBest.node.content}${randomVar}`,
          score: actualBest.score,
          isCritical: actualBest.node.difficulty === 'critical',
          iqLevel: this.cognitiveLevel,
          method: actualBest.score > 100 ? 'exact' : 'neural'
        };
      }
      return null;
    } finally {
      this.isSearching = false;
    }
  }

  private linkRelatedNodes(newNode: KnowledgeNode) {
    const related = this.memoryNodes.find(n => 
      n.id !== newNode.id && n.category === newNode.category && 
      n.tags.some(t => newNode.tags.includes(t))
    );
    if (related && !newNode.tags.includes('related-' + related.id)) {
      newNode.tags.push('linked-context');
    }
  }

  processNewKnowledge(content: string, categoryOverride?: string, sourceType: KnowledgeNode['sourceType'] = 'autonomous', question?: string, answer?: string, customTags?: string[]) {
    const lowerContent = content.toLowerCase().trim();
    
    const words = lowerContent.split(/\s+/).filter(w => w.length > 0);
    const isJunk = words.length <= 1 && !content.includes('```');
    const isChat = categoryOverride === 'Chat' || (this.detectCategory(content) === 'Chat' && !content.includes('```'));
    
    if (isJunk || (content.length < 30 && isChat && sourceType !== 'qa_rule')) return; 

    const contentWordSet = new Set(words.filter(w => w.length > 2));
    const isDuplicate = this.memoryNodes.some(n => {
        if (n.content.toLowerCase().trim() === lowerContent) return true;
        if (sourceType === 'qa_rule' && n.sourceType === 'qa_rule' && question && n.question) {
            const qWordsSelf = new Set(question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
            const qWordsOther = new Set(n.question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
            const intersection = [...qWordsSelf].filter(w => qWordsOther.has(w));
            const matchRatio = intersection.length / Math.max(qWordsSelf.size, qWordsOther.size, 1);
            if (matchRatio > 0.7) return true;
        }

        if (sourceType === 'autonomous' || sourceType === 'manual_ans') {
            const nWords = n.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const nWordSet = new Set(nWords);
            const overlap = [...contentWordSet].filter(w => nWordSet.has(w));
            const score = overlap.length / Math.max(contentWordSet.size, nWordSet.size, 1);
            return score > 0.7; 
        }
        return false;
    });

    if (isDuplicate) return;

    const difficulty = this.analyzeDifficulty(content);
    const category = categoryOverride || this.detectCategory(content);
    
    const newNode: KnowledgeNode = {
      id: `C${Date.now()}`,
      category,
      difficulty,
      content,
      originalRequest: question || content,
      tags: [
        sourceType === 'autonomous' ? 'autonomous' : 'manual-injection', 
        ...(sourceType === 'qa_rule' ? ['qa_rule'] : []),
        ...(customTags || [])
      ],
      timestamp: Date.now(),
      confidence: 1.0,
      relationNodes: [],
      sourceType,
      question,
      answer
    };

    this.memoryNodes.push(newNode);
    this.indexNode(newNode);
    this.linkRelatedNodes(newNode);
    this.updateCognitiveLevel();
    this.saveToStorage();
  }

  private analyzeDifficulty(content: string): KnowledgeNode['difficulty'] {
    const complexKeywords = ['hệ thống', 'kiến trúc', 'tối ưu', 'thuật toán', 'phức tạp', 'quy mô', 'vận hành', 'logic', 'blueprint', 'strategic'];
    const mediumKeywords = ['giải thích', 'cách làm', 'tại sao', 'so sánh', 'quy trình', 'hướng dẫn'];
    
    let score = 0;
    complexKeywords.forEach(kw => { if (content.toLowerCase().includes(kw)) score += 2; });
    mediumKeywords.forEach(kw => { if (content.toLowerCase().includes(kw)) score += 1; });
    
    if (content.length > 500) score += 2;
    if (content.length > 200) score += 1;
    if (content.includes('```')) score += 2; 

    if (score >= 6) return 'critical';
    if (score >= 4) return 'hard';
    if (score >= 2) return 'medium';
    return 'easy';
  }

  private detectCategory(content: string): string {
    const lower = content.toLowerCase().trim();
    
    if (/\b(vật lý|lượng tử|vllt|vlyk|nguyên tử|phân tử|nhiệt động|lực học|vũ trụ|thiên văn|khoa học|science|physics|quantum)\b/i.test(lower)) return 'Science';
    if (/\b(toán|số học|phép tính|hình học|logarit|integral|đạo hàm|ma trận|math|calc)\b/i.test(lower)) return 'Math';
    if (/\b(struct|function|class|algorithm|void|int|public|private|const|let|var|import|export|include|using|git|npm|docker|k8s)\b/i.test(lower) || content.includes('```')) return 'Code';

    const greetings = ['chào', 'hello', 'hi', 'xin chào', 'hey', 'alo', 'ê', 'bạn là ai', 'ai là bạn'];
    if (greetings.some(g => lower.startsWith(g)) || lower.length < 25) return 'Chat';
    
    return 'Chat';
  }

  private optimizeMemory() {
    if (this.memoryNodes.length > 60) {
      this.memoryNodes = this.memoryNodes
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    }
  }

  public generateLocalFallback(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (anyIn(lowerContent, ['calc', 'tính', 'bằng bao nhiêu', '+', '-', '*', '/'])) {
      try {
        const expr = content.match(/[\d\+\-\*\/\.\(\)\s]+/)?.[0].trim();
        if (expr && expr.length > 1) return `[MINI LLM LOGIC TASK]\n\nKết quả tính toán nội bộ: **${eval(expr)}**`;
      } catch (e) {}
    }

    if (anyIn(lowerContent, ['plan', 'kế hoạch', 'lịch trình', 'step', 'bước'])) {
      return `[MINI LLM STRATEGY AGENT]\n\n*Hệ thống Offline kích hoạt module lập kế hoạch:*\n\n1. **Phân tích mục tiêu (Target):** Nhận diện giá trị cốt lõi của yêu cầu.\n2. **Shadow Partitioning:** Chia nhỏ công việc dựa trên độ khó tri thức.\n3. **Cân đối tài nguyên:** Tối ưu hóa thời gian thực thi.\n4. **Đánh giá đầu ra:** Kiểm soát chất lượng 4/4 điểm.`;
    }

    const scoredNodes = this.memoryNodes
      .map(node => {
        let score = 0;
        const nodeText = node.content.toLowerCase();
        const queryWords = lowerContent.split(/\s+/).filter(w => w.length > 2);

        queryWords.forEach(qw => {
          if (nodeText.includes(qw)) score += 20;
        });

        if (nodeText.includes(lowerContent)) score += 60;

        node.tags.forEach(tag => {
          if (lowerContent.includes(tag.toLowerCase())) score += 40;
        });

        if (node.difficulty === 'critical') score += 25;
        if (node.difficulty === 'hard') score += 15;

        return { node, score };
      })
      .filter(entry => entry.score > 35)
      .sort((a, b) => b.score - a.score);

    if (scoredNodes.length > 0) {
      const topEntries = scoredNodes.slice(0, 3);
      let result = `*(Hiện tại kết nối mạng đang gián đoạn, mình xin phép phản hồi dựa trên những ghi nhớ sẵn có giữa hai tụi mình nhé!)*\n\n`;
      
      topEntries.forEach((entry, idx) => {
        const icon = idx === 0 ? "🔱" : "💠";
        result += `### ${icon} ${entry.node.category} (Độ tin cậy: ${Math.min(100, entry.score)}%)\n${entry.node.content}\n\n`;
      });

      if (topEntries.length > 1) {
        result += `\n---\n*Mong rằng những đúc kết này sẽ hữu ích cho Bạn trong lúc chờ kết nối ổn định lại nhé!*`;
      }
      return result;
    }

    const lastMsg = this.history[this.history.length - 2]; 
    if (lastMsg && lastMsg.role === 'assistant') {
       return `Hiện tại kết nối máy chủ đang gián đoạn một chút và mình chưa có sẵn thông tin này trong bộ nhớ cục bộ. Tuy nhiên, Bạn có nhớ điểm quan trọng chúng ta từng thảo luận không: "${lastMsg.content.slice(0, 100)}...". Bạn có thể chỉ dẫn thêm cho mình hoặc gửi lại yêu cầu khi đường truyền tốt hơn nhé!`;
    }

    return "Có vẻ như kết nối với máy chủ AI đang gặp chút sự cố và mình tạm thời chưa tìm thấy thông tin tương thích trong bộ nhớ. Bạn đợi ít phút rồi thử lại với mình nhé!";
  }

  public getContext() {
    const activeNodes = this.memoryNodes.filter(n => n.difficulty === 'critical' || n.difficulty === 'hard');
    const summaryHeader = `[Memory Partition: ${activeNodes.length} high-difficulty nodes prioritized]`;
    
    return {
      profile: "Advanced SaaS Strategist",
      summary: `${summaryHeader}\n${this.currentSummary}`,
      recent: this.history,
      memoryStats: {
        totalNodes: this.memoryNodes.length,
        difficultyDist: {
          easy: this.memoryNodes.filter(n => n.difficulty === 'easy').length,
          medium: this.memoryNodes.filter(n => n.difficulty === 'medium').length,
          hard: this.memoryNodes.filter(n => n.difficulty === 'hard').length,
          critical: this.memoryNodes.filter(n => n.difficulty === 'critical').length,
        }
      } as MemoryStats
    };
  }
}

function anyIn(source: string, keywords: string[]): boolean {
  return keywords.some(kw => source.includes(kw));
}

