import os
import json
import re
from datetime import datetime
import difflib

class MiniMasterLLM:
    def __init__(self, knowledgeFile="ShadowBrain_Knowledge_Package.json", txtFallback="ShadowBrain_Memory.txt"):
        self.knowledgeFile = knowledgeFile
        self.txtFallback = txtFallback
        self.memory = []
        self.history = []
        self.loadKnowledge()

    def loadKnowledge(self):
        if os.path.exists(self.knowledgeFile):
            self.loadJson()
        elif os.path.exists(self.txtFallback):
            self.loadTxt()
        else:
            print(f"[-] CHỦ Ý: Chưa tìm thấy file tri thức. Mini-LLM đang chạy nội bộ (Rỗng).")

    def loadJson(self):
        try:
            with open(self.knowledgeFile, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.memory = data.get('nodes', [])
                print(f"[+] HỆ THỐNG: Đã đồng chuẩn {len(self.memory)} vùng tri thức từ AI Package.")
        except Exception as e:
            print(f"[-] LỖI KỸ THUẬT (JSON): {e}")

    def loadTxt(self):
        try:
            with open(self.txtFallback, 'r', encoding='utf-8') as f:
                content = f.read()
            nodes = re.split(r'\[NODE #\d+\]', content)
            for node in nodes:
                if not node.strip(): continue
                item = {}
                lines = node.strip().split('\n')
                currContent = []
                isContent = False
                for line in lines:
                    if line.startswith('Timestamp:'): item['timestamp'] = line.replace('Timestamp:', '').strip()
                    elif line.startswith('Category:'): item['category'] = line.replace('Category:', '').strip()
                    elif line.startswith('Difficulty:'): item['difficulty'] = line.replace('Difficulty:', '').strip()
                    elif line.startswith('Tags:'): item['tags'] = line.replace('Tags:', '').strip().split(', ')
                    elif line.startswith('Content:'): 
                        isContent = True
                        currContent.append(line.replace('Content:', '').strip())
                    elif isContent and not line.startswith('---'):
                        currContent.append(line)
                item['content'] = '\n'.join(currContent)
                self.memory.append(item)
            print(f"[+] HỆ THỐNG: Đã trích xuất {len(self.memory)} vùng tri thức từ file TXT.")
        except Exception as e:
            print(f"[-] LỖI KỸ THUẬT (TXT): {e}")

    def semanticMatch(self, query):
        query = query.lower()
        candidates = []
        for node in self.memory:
            score = 0
            contentLower = node['content'].lower()
            
            for tag in node.get('tags', []):
                if query in tag.lower(): score += 60
                
            if query in contentLower: score += 40
            
            ratio = difflib.SequenceMatcher(None, query, contentLower).ratio()
            score += ratio * 50

            if score > 20:
                candidates.append((score, node))
        
        return sorted(candidates, key=lambda x: x[0], reverse=True)

    def synthesizeResponse(self, query):
        matches = self.semanticMatch(query)
        
        if not matches:
            return "Tôi đã quét qua toàn bộ ShadowBrain nhưng chưa tìm thấy tri thức tương ứng. Tuy nhiên, tôi vẫn có thể hỗ trợ bạn các tác vụ logic cơ bản (calc, plan, stat)."

        topMatches = matches[:3]
        response = f"--- [SYNTHESIS RESPONSE ACTIVE] ---\n\n"
        
        for i, (score, node) in enumerate(topMatches):
            label = "💎 TRỌNG TÂM:" if i == 0 else "🧬 LIÊN KẾT:"
            response += f"{label} (Phân vùng: {node['category']} | Độ khó: {node['difficulty']})\n{node['content']}\n\n"
            
        if len(topMatches) > 1:
            response += "🔹 Ghi chú: Tổng hợp tri thức đa chiều thành công."
            
        return response

    def runLogicTask(self, prompt):
        prompt = prompt.lower()
        
        if any(x in prompt for x in ['calc', 'tính', 'bằng bao nhiêu']):
            try:
                expr = "".join(re.findall(r'[\d\+\-\*\/\.\(\)\s]+', prompt)).strip()
                if expr:
                    return f"KẾT QUẢ LOGIC: {eval(expr)}"
            except: pass

        if any(x in prompt for x in ['plan', 'kế hoạch', 'lịch trình']):
            return ("PHÂN TÍCH CHIẾN LƯỢC:\n"
                    "1. Thiết lập mục tiêu SMART.\n"
                    "2. Ưu tiên các nhiệm vụ quan trọng (ShadowNodes).\n"
                    "3. Phân bổ tài nguyên và thời gian.\n"
                    "4. Kiểm soát rủi ro và đánh giá.")

        if 'stat' in prompt or 'thống kê' in prompt:
            categories = {}
            for n in self.memory:
                cat = n['category']
                categories[cat] = categories.get(cat, 0) + 1
            msg = "THÔNG SỐ TRI THỨC:\n"
            for cat, count in categories.items():
                msg += f"- {cat}: {count} nốt\n"
            return msg

        return None

    def analyzeDifficulty(self, content):
        complexKws = ['hệ thống', 'kiến trúc', 'tối ưu', 'thuật toán', 'phát triển', 'logic', 'blueprint', 'chiến lược']
        score = 0
        lowerC = content.lower()
        for kw in complexKws:
            if kw in lowerC: score += 2
        if len(content) > 500: score += 2
        if '```' in content: score += 3
        
        if score >= 6: return "critical"
        if score >= 4: return "hard"
        if score >= 2: return "medium"
        return "easy"

    def learnFromContent(self, content):
        if len(content.strip()) < 30: 
            return "[-] Nội dung quá ngắn, không đủ mật độ tri thức để nạp vào ShadowBrain."
        
        for node in self.memory:
            if difflib.SequenceMatcher(None, content[:100], node['content'][:100]).ratio() > 0.85:
                return "[-] Tri thức này đã tồn tại trong bộ nhớ ShadowBrain."

        extractedTags = re.findall(r'[A-Z][a-z]{3,}', content)
        tags = list(set([t.lower() for t in extractedTags[:5]]))
        if "self-learned" not in tags: tags.append("self-learned")
        
        difficulty = self.analyzeDifficulty(content)
        category = "Technical" if any(x in content.lower() for x in ['code', 'api', 'dev', 'hệ thống']) else "General"
        
        newNode = {
            "id": f"local-{int(datetime.now().timestamp())}",
            "content": content.strip(),
            "difficulty": difficulty,
            "category": category,
            "tags": tags,
            "timestamp": datetime.now().isoformat()
        }
        
        self.memory.append(newNode)
        self.saveToJson()
        return f"[+] THÀNH CÔNG: Đã nạp tri thức mới vào ShadowBrain. [Độ khó: {difficulty.upper()} | Tags: {', '.join(tags)}]"

    def saveToJson(self):
        try:
            data = {"nodes": self.memory, "updated_at": datetime.now().isoformat()}
            with open(self.knowledgeFile, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"[-] LỖI LƯU TRỮ: {e}")
            return False

    def analyzeContent(self, content):
        paragraphs = content.split('\n\n')
        totalLen = len(content)
        hasCode = '```' in content
        
        analysis = (f"--- [COGNITIVE ANALYSIS REPORT] ---\n"
                    f"1. Quy mô tri thức: {totalLen} ký tự (~{len(content.split())} từ).\n"
                    f"2. Cấu trúc: {len(paragraphs)} đoạn nội dung logic.\n"
                    f"3. Thành phần: {'Có chứa Code/Technical' if hasCode else 'Văn bản thuần túy'}.\n"
                    f"4. Nhận diện: {self.analyzeDifficulty(content).upper()} content.\n"
                    f"5. Đề xuất: " + ("Cần nạp vào ShadowBrain ngay." if totalLen > 100 else "Thông tin mang tính chất trao đổi ngắn."))
        return analysis

    def mainLoop(self):
        print("\n" + "🚀"*20)
        print(" MINI MASTER LLM v3.0 (AUTONOMOUS AGENT) ")
        print(" Chế độ: Tự học & Phân tích Tri thức ")
        print(" Lệnh mới: 'learn' (Nạp tri thức), 'analyze' (Phân tích) ")
        print(" Lệnh logic: stat, plan, calc [phép tính]")
        print("🚀"*20)

        while True:
            try:
                userMsg = input("\n[USER]> ").strip()
                if not userMsg: continue
                if userMsg.lower() in ['exit', 'quit', 'thoát']: 
                    print("Hệ thống Offline. Tạm biệt Master.")
                    break

                if userMsg.lower() == 'learn':
                    print("\n[HỆ THỐNG]> Hãy dán nội dung từ API bạn muốn tôi học vào đây (Gõ 'END' ở dòng mới để kết thúc):")
                    lines = []
                    while True:
                        line = input()
                        if line == "END": break
                        lines.append(line)
                    rawContent = "\n".join(lines)
                    print(f"\n[MINI-LLM]> {self.learnFromContent(rawContent)}")
                    continue

                if userMsg.lower() == 'analyze':
                    print("\n[HỆ THỐNG]> Nhập nội dung cần phân tích logic (Gõ 'END' ở dòng mới để kết thúc):")
                    lines = []
                    while True:
                        line = input()
                        if line == "END": break
                        lines.append(line)
                    rawContent = "\n".join(lines)
                    print(f"\n[MINI-LLM]> {self.analyzeContent(rawContent)}")
                    continue

                logicRes = self.runLogicTask(userMsg)
                if logicRes:
                    print(f"\n[SYSTEM]> {logicRes}")
                    continue

                response = self.synthesizeResponse(userMsg)
                print(f"\n[MINI-LLM]> {response}")
                
                self.history.append(userMsg)
                if len(self.history) > 10: self.history.pop(0)

            except KeyboardInterrupt: break
            except Exception as e:
                print(f"\n[ERROR]> Hệ thống gặp sự cố: {e}")

if __name__ == "__main__":
    agent = MiniMasterLLM()
    agent.mainLoop()ogic_task(user_msg)
                if logic_res:
                    print(f"\n[SYSTEM]> {logic_res}")
                    continue

                # 4. Phản hồi từ tri thức ShadowBrain
                response = self.synthesize_response(user_msg)
                print(f"\n[MINI-LLM]> {response}")
                
                self.history.append(user_msg)
                if len(self.history) > 10: self.history.pop(0)

            except KeyboardInterrupt: break
            except Exception as e:
                print(f"\n[ERROR]> Hệ thống gặp sự cố: {e}")

if __name__ == "__main__":
    agent = MiniMasterLLM()
    agent.main_loop()
