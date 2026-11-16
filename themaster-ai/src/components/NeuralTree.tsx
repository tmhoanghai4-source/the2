import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KnowledgeNode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Info, Terminal, Brain, Code, Calculator, Atom, MessageSquare } from 'lucide-react';

interface NeuralTreeProps {
  nodes: KnowledgeNode[];
  onClose: () => void;
  onDeleteNode?: (id: string) => void;
}

const NeuralTree: React.FC<NeuralTreeProps> = ({ nodes, onClose, onDeleteNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoverNode, setHoverNode] = useState<KnowledgeNode | any>(null);
  const activeTag = null;

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = window.innerWidth * 0.9;
    const height = window.innerHeight * 0.8;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "width: 100%; height: 100%; font: 10px sans-serif;");

    const g = svg.append("g");

    const rootData: any = {
      id: "TM-CENTER",
      name: "TheMaster",
      isRoot: true
    };

    const graphNodes: any[] = [rootData];
    const graphLinks: any[] = [];

    const categories = ['Code', 'Math', 'Science', 'Chat'];
    
    categories.forEach(cat => {
      const catId = `cat-${cat}`;
      graphNodes.push({ id: catId, name: cat, isCategory: true });
      graphLinks.push({ source: "TM-CENTER", target: catId, isCat: true });

      const catNodes = nodes.filter(n => n.category === cat);
      catNodes.forEach(n => {
        const displayName = (n as any).question || n.content;
        graphNodes.push({ 
          ...n,
          name: displayName.slice(0, 25) + (displayName.length > 25 ? "..." : ""), 
          isNode: true 
        });
        graphLinks.push({ source: catId, target: n.id, isCat: true });
      });
    });

    // Add shared tags / contextual similarity links
    const nodeOnly = graphNodes.filter(n => n.isNode);
    for (let i = 0; i < nodeOnly.length; i++) {
        for (let j = i + 1; j < nodeOnly.length; j++) {
            const n1 = nodeOnly[i];
            const n2 = nodeOnly[j];
            // Condition for link: shared tags
            const sharedTags = n1.tags.filter((t: string) => n2.tags.includes(t));
            let similarity = 0;
            if (sharedTags.length > 0) {
                similarity += sharedTags.length * 0.5;
            }
            // Contextual similarity check (common words > 5)
            const w1 = new Set(n1.content.toLowerCase().split(/\s+/));
            const w2 = new Set(n2.content.toLowerCase().split(/\s+/));
            const intersect = Array.from(w1 as unknown as string[]).filter((w: string) => w2.has(w) && w.length > 4);
            if (intersect.length > 5) {
                similarity += 0.3;
            }

            if (similarity > 0) {
                graphLinks.push({
                    source: n1.id,
                    target: n2.id,
                    isCat: false,
                    strength: Math.min(similarity, 1)
                });
            }
        }
    }

    // TAG CLUSTERING LOGIC: Organize nodes by their most frequent tags
    const allTags = nodes.flatMap(n => n.tags);
    const tagCounts: Record<string, number> = {};
    allTags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Increase top tags
      .map(entry => entry[0]);

    // Create Tag Cluster Nodes
    topTags.forEach((tag, i) => {
      const angle = (i / topTags.length) * 2 * Math.PI;
      const clusterId = `tag-${tag}`;
      const radius = Math.min(width, height) * 0.35;
      graphNodes.push({ 
        id: clusterId, 
        name: `#${tag.toUpperCase()}`, 
        isTagCluster: true,
        fx: width / 2 + Math.cos(angle) * radius,
        fy: height / 2 + Math.sin(angle) * radius
      });

      // Link nodes with this tag to the cluster node
      nodes.filter(n => n.tags.includes(tag)).forEach(n => {
        graphLinks.push({ source: clusterId, target: n.id, isTagLink: true, strength: 0.8 });
      });
    });

    const simulation = d3.forceSimulation(graphNodes)
      .force("link", d3.forceLink(graphLinks).id((d: any) => d.id).distance(d => {
        if (d.isCat) return d.source.isRoot ? 250 : 150;
        if (d.isTagLink) return 80;
        return 200;
      }).strength(d => {
        if (d.isCat) return 1;
        if (d.isTagLink) return 0.5;
        return d.strength || 0.1;
      }))
      .force("charge", d3.forceManyBody().strength((d: any) => {
        if (d.isRoot) return -3000;
        if (d.isCategory) return -800;
        if (d.isTagCluster) return -1200;
        return -150;
      }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => {
        if (d.isRoot) return 50;
        if (d.isCategory) return 35;
        if (d.isTagCluster) return 45;
        return 18;
      }));

    // Glow filter for critical nodes
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const link = g.append("g")
      .attr("stroke", "#10b981")
      .selectAll("line")
      .data(graphLinks)
      .join("line")
      .attr("stroke-opacity", d => {
        if (!activeTag) return d.isCat ? 0.3 : 0.1;
        const sourceTags = d.source.tags || [];
        const targetTags = d.target.tags || [];
        const isClusterLink = d.source.id === `tag-${activeTag}` || d.target.id === `tag-${activeTag}`;
        const sourceMatches = sourceTags.includes(activeTag);
        const targetMatches = targetTags.includes(activeTag);
        if (isClusterLink || sourceMatches || targetMatches) {
          return d.isCat ? 0.6 : 0.4;
        }
        return 0.02;
      })
      .attr("stroke-width", d => d.isCat ? 1.5 : (d.strength || 0) * 2)
      .attr("stroke-dasharray", d => d.isCat ? "none" : "3,3")
      .attr("stroke", d => {
        if (!activeTag) return d.isCat ? "#10b981" : "#3b82f6";
        const isClusterLink = d.source.id === `tag-${activeTag}` || d.target.id === `tag-${activeTag}`;
        return isClusterLink ? "#ef4444" : (d.isCat ? "#10b981" : "#3b82f6");
      });

    const node = g.append("g")
      .selectAll("g")
      .data(graphNodes)
      .join("g")
      .attr("class", "node-group")
      .on("click", (e, d: any) => {
        if (d.isNode) {
            setSelectedNode(d);
        }
      })
      .on("mouseover", (e, d) => setHoverNode(d))
      .on("mouseout", () => setHoverNode(null))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Dynamic radius - ULTRA COMPACT for high density
    node.append("circle")
      .attr("r", d => {
        if (d.isRoot) return 5;
        if (d.isCategory) return 3.5;
        if (d.isTagCluster) return 4;
        return d.difficulty === 'critical' ? 3 : 2;
      })
      .attr("fill", d => {
        if (d.isRoot) return "#10b981";
        if (d.isTagCluster) return "none";
        if (d.isCategory) {
          if (d.name === 'Code') return "#a855f7";
          if (d.name === 'Math') return "#3b82f6";
          if (d.name === 'Science') return "#f59e0b";
          return "#10b981";
        }
        return d.difficulty === 'critical' ? "#ef4444" : 
               d.difficulty === 'hard' ? "#f97316" : 
               d.difficulty === 'medium' ? "#3b82f6" : "#10b981";
      })
      .attr("stroke", d => {
        if (d.isTagCluster) return "#3b82f6";
        return d.difficulty === 'critical' ? "#ffcccc" : "#000";
      })
      .attr("stroke-width", d => d.isTagCluster ? 1 : (d.difficulty === 'critical' ? 0.8 : 0.5))
      .attr("stroke-dasharray", d => d.isTagCluster ? "2,2" : "none")
      .style("filter", d => d.difficulty === 'critical' || d.isTagCluster ? "url(#glow)" : "none")
      .classed("animate-pulse", d => d.difficulty === 'critical' || d.isTagCluster)
      .attr("opacity", d => {
        if (!activeTag) return 1;
        if (d.isRoot || d.isCategory) return 0.7;
        if (d.isTagCluster && d.id === `tag-${activeTag}`) return 1;
        if (d.isTagCluster) return 0.15;
        if (d.tags && d.tags.includes(activeTag)) return 1;
        return 0.12;
      })
      .attr("class", "cursor-pointer hover:scale-150 transition-transform duration-200");

    node.append("text")
      .attr("x", d => d.isRoot ? 8 : (d.isTagCluster ? 6 : 4))
      .attr("y", 2)
      .attr("fill", d => d.isTagCluster ? "#3b82f6" : "#10b981")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", d => d.isRoot || d.isCategory || d.isTagCluster ? "900" : "bold")
      .attr("font-size", d => d.isRoot ? "6px" : (d.isTagCluster ? "5px" : "3.5px"))
      .attr("paint-order", "stroke")
      .attr("stroke", "#000")
      .attr("stroke-width", d => d.isTagCluster ? 3 : 2)
      .attr("opacity", d => {
        if (!activeTag) return 1;
        if (d.isRoot || d.isCategory) return 0.7;
        if (d.isTagCluster && d.id === `tag-${activeTag}`) return 1;
        if (d.isTagCluster) return 0.15;
        if (d.tags && d.tags.includes(activeTag)) return 1;
        return 0.12;
      })
      .text(d => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom as any);

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  }, [nodes, activeTag]);

  const learningRatio = Math.min(100, (nodes.length / 50) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 lg:p-8 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]" />
      
      <div className="relative w-full h-full flex flex-col gap-4 max-w-7xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-emerald-500 animate-pulse" />
              <div>
                <h2 className="text-emerald-500 font-mono text-xl font-black tracking-widest uppercase">TheMaster Neural Map</h2>
                <div className="flex items-center gap-4 mt-1">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] text-emerald-500/40 uppercase font-black tracking-widest">Learning Ratio:</span>
                     <div className="w-32 h-1.5 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/20">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${learningRatio}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                       />
                     </div>
                     <span className="text-[10px] text-emerald-500 font-black">{learningRatio.toFixed(1)}%</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-emerald-500/10 rounded-2xl text-emerald-500 transition-all active:scale-95 border border-emerald-500/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Main Map */}
          <div className="flex-1 bg-zinc-950/50 backdrop-blur-sm border border-emerald-500/10 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none">
               {[
                 { icon: Code, label: 'Code', color: 'text-purple-500' },
                 { icon: Calculator, label: 'Math', color: 'text-blue-500' },
                 { icon: Atom, label: 'Science', color: 'text-amber-500' },
                 { icon: MessageSquare, label: 'Chat', color: 'text-emerald-500' }
               ].map(item => (
                 <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full border border-white/5">
                   <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">{item.label}</span>
                 </div>
               ))}
            </div>



            <svg ref={svgRef} className="w-full h-full cursor-move" />
            
            {/* Tooltip on Hover */}
            <AnimatePresence>
              {hoverNode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute bottom-6 right-6 p-4 bg-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl max-w-xs pointer-events-none"
                >
                  <p className="text-[10px] text-emerald-500 font-black uppercase mb-1">{hoverNode.category || 'System Core'}</p>
                  <p className="text-xs text-text-primary line-clamp-2">{hoverNode.name || hoverNode.content}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Master Inspector Panel (Split View) */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-[400px] bg-zinc-900 border border-emerald-500/20 rounded-[3rem] flex flex-col flex-none overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-emerald-500/10 flex items-center justify-between bg-zinc-950/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                      <Terminal className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-emerald-500 font-black tracking-widest uppercase text-sm">Node Inspector</h3>
                      <p className="text-[10px] text-emerald-500/40 uppercase font-mono">{selectedNode.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  {/* Category & Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[9px] text-emerald-500/50 uppercase font-black mb-1">Category</p>
                      <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">{selectedNode.category}</span>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[9px] text-emerald-500/50 uppercase font-black mb-1">Confidence</p>
                      <span className="text-xs font-black text-emerald-500">{(selectedNode.confidence * 100).toFixed(0)}% Authorized</span>
                    </div>
                  </div>

                  {/* Dual Pane: Request vs Result */}
                    <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] text-text-secondary/50 uppercase font-black tracking-widest px-2">
                         <Search className="w-3 h-3" /> Question (Request)
                       </label>
                       <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 text-sm text-text-primary leading-relaxed opacity-80 font-medium">
                         {(selectedNode as any).question || selectedNode.originalRequest || "Knowledge synthesized during initialization sequence."}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="flex items-center gap-2 text-[10px] text-emerald-500/50 uppercase font-black tracking-widest px-2">
                         <Brain className="w-3 h-3" /> Answer (Result)
                       </label>
                       <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-sm text-emerald-400 leading-relaxed font-bold break-words">
                         {(selectedNode as any).answer || selectedNode.content}
                       </div>
                    </div>

                    {/* Progress Bar (Synaptic Strength) */}
                    <div className="space-y-2 pt-2">
                       <div className="flex items-center justify-between px-2">
                         <span className="text-[10px] text-emerald-500/40 uppercase font-black tracking-widest">Synaptic Strength</span>
                         <span className="text-[10px] text-emerald-500 font-black">{(selectedNode.confidence * 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full h-2 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/10">
                         <div 
                           className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                           style={{ width: `${selectedNode.confidence * 100}%` }}
                         />
                       </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  {onDeleteNode && (
                    <div className="pt-4">
                      <button 
                        onClick={() => {
                          if (window.confirm("CRITICAL: Prune this neuron?")) {
                            onDeleteNode(selectedNode.id);
                            setSelectedNode(null);
                          }
                        }}
                        className="w-full py-3 bg-red-600/10 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-red-600/10"
                      >
                        Prune Neuron (Delete)
                      </button>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-6 border-t border-emerald-500/10 space-y-3">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-secondary/50 uppercase font-bold">Learned At</span>
                      <span className="text-emerald-500/70 font-mono">{new Date(selectedNode.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-text-secondary/50 uppercase font-bold">Complexity</span>
                      <span className="text-red-400 font-mono uppercase font-black">{selectedNode.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-950/80 border-t border-emerald-500/10">
                   <p className="text-[9px] text-emerald-500/40 text-center uppercase tracking-widest font-black leading-relaxed">
                     Cognitive weight authenticated by THEMASTER.<br/>Node integrity verified.
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default NeuralTree;
