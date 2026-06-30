'use client';

/* Interactive 3D graph client that handles search, image analysis, node rendering,
 and the on-screen agent terminal. */

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

// API URL from environment variable, fallback to localhost for development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const formatNodeLabel = (label) => {
    if (!label) return '';

    const words = label.split(' ');
    if (words.length <= 2 || label.length <= 18) return label;

    const splitIndex = Math.ceil(words.length / 2);
    return `${words.slice(0, splitIndex).join(' ')}\n${words.slice(splitIndex).join(' ')}`;
};

export default function SearchGraph() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNode, setSelectedNode] = useState(null);
    const [pendingResearchNode, setPendingResearchNode] = useState(null);
    const [agentThoughts, setAgentThoughts] = useState([]);
    const [isAutoPilot, setIsAutoPilot] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [nodeImage, setNodeImage] = useState(null);
    const fgRef = useRef();

    const materialCache = useRef({});
    const geometryRef = useRef();
    const ringGeometryRef = useRef();

    // Initialize geometry once
    if (!geometryRef.current) {
        geometryRef.current = new THREE.SphereGeometry(1, 32, 32);
    }

    if (!ringGeometryRef.current) {
        ringGeometryRef.current = new THREE.TorusGeometry(4, 0.25, 12, 48);
    }

    const nodeThreeObject = useCallback(node => {
        const radius = Math.pow(node.val || 1, 1 / 3) * 4;
        const isMainNode = node.val >= 20;
        const isSelected = selectedNode && node.id === selectedNode.id;

        if (!materialCache.current[node.color]) {
            materialCache.current[node.color] = new THREE.MeshPhysicalMaterial({
                color: node.color,
                transparent: true,
                opacity: 0.8,
                roughness: 0.1,
                metalness: 0.1,
                transmission: 0.2,
                clearcoat: 1.0,
            });
        }

        const material = materialCache.current[node.color];
        const sphere = new THREE.Mesh(geometryRef.current, material);
        sphere.scale.setScalar(radius);

        const sprite = new SpriteText(formatNodeLabel(node.name));
        sprite.color = isSelected || isMainNode ? '#ffffff' : '#d7f0ff';
        sprite.textHeight = isSelected || isMainNode ? 6 : 4;
        sprite.backgroundColor = 'rgba(0, 0, 0, 0.55)';
        sprite.padding = 2.5;
        sprite.borderRadius = 4;
        sprite.position.y = radius + (isSelected || isMainNode ? 4.5 : 3.5);
        sprite.material.depthWrite = false;
        sprite.material.transparent = true;
        sprite.material.opacity = isSelected || isMainNode ? 1 : 0.9;

        const group = new THREE.Group();
        group.add(sphere);
        group.add(sprite);

        if (isSelected) {
            const ring = new THREE.Mesh(
                ringGeometryRef.current,
                new THREE.MeshBasicMaterial({ color: '#00ccff', transparent: true, opacity: 0.5 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.scale.setScalar(radius * 0.28);
            group.add(ring);
        }

        return group;
    }, [selectedNode]);

    const performSearch = useCallback(async (query, sourceNodeId = null, depth = 0) => {
        if (!query) return;

        if (depth === 0) {
            setAgentThoughts([]);
            setIsTerminalOpen(true);
        }

        const personas = ['optimist', 'critic', 'historian'];

        personas.forEach(async (persona) => {
            try {
                setAgentThoughts(prev => [...prev, `🚀 Deploying ${persona.toUpperCase()} Agent...`]);

                const res = await fetch(`${API_URL}/research-agent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: query, k: 5, persona: persona })
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                const data = await res.json();

                // Streaming Updates!
                if (data.nodes && Array.isArray(data.nodes)) {
                    updateGraph(data.nodes, query, sourceNodeId);
                    setAgentThoughts(prev => [...prev, `✅ ${persona.toUpperCase()} Agent finished.`]);
                } else {
                    console.warn(`Invalid response from ${persona} agent:`, data);
                    setAgentThoughts(prev => [...prev, `⚠️ ${persona.toUpperCase()} Agent returned invalid data.`]);
                }

                if (data.thoughts && Array.isArray(data.thoughts)) {
                    // Just show the first thought to keep it clean
                    if (data.thoughts.length > 0) setAgentThoughts(prev => [...prev, `  > ${data.thoughts[0]}`]);
                }

            } catch (err) {
                console.error(`${persona} Agent failed`, err);
                setAgentThoughts(prev => [...prev, `❌ ${persona.toUpperCase()} Agent failed: ${err.message}`]);
            }
        });

    }, []);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64String = reader.result;

            try {
                console.log("Uploading image...");
                const res = await fetch(`${API_URL}/analyze-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: base64String })
                });

                const results = await res.json();
                if (results && results.length > 0) {
                    updateGraph(results, results[0].title, null);
                }

            } catch (err) {
                console.error("Image Upload Error:", err);
            }
        };
    };

    const updateGraph = (results, centerTopic, sourceNodeId) => {
        setGraphData(prevData => {
            const existingNodeIds = new Set(prevData.nodes.map(n => n.id));
            const newNodes = [...prevData.nodes];
            const newLinks = [...prevData.links];

            const centerId = `topic-${centerTopic}`;
            if (!existingNodeIds.has(centerId) && !sourceNodeId) {
                newNodes.push({ id: centerId, name: centerTopic, val: 20, color: 'red' });
                existingNodeIds.add(centerId);
            }

            const actualSourceId = sourceNodeId || centerId;

            results.forEach(item => {
                if (!existingNodeIds.has(item.id)) {
                    let nodeColor = '#00ccff'; // Default
                    if (item.group === 'Optimist') nodeColor = '#00ff88'; // Green
                    else if (item.group === 'Critic') nodeColor = '#ff4444';   // Red
                    else if (item.group === 'Historian') nodeColor = '#ffcc00'; // Gold
                    else if (item.group === 'Gemini') nodeColor = '#bf00ff';

                    newNodes.push({
                        id: item.id,
                        name: item.title,
                        val: 10,
                        color: nodeColor,
                        desc: item.abstract,
                        url: item.url
                    });
                    existingNodeIds.add(item.id);
                }

                const linkExists = newLinks.some(l =>
                    (l.source === actualSourceId && l.target === item.id) ||
                    (l.source === item.id && l.target === actualSourceId)
                );

                if (!linkExists) {
                    newLinks.push({ source: actualSourceId, target: item.id });
                }
            });

            return { nodes: newNodes, links: newLinks };
        });
    };

    const [showInstructions, setShowInstructions] = useState(true);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000011' }}>

            {showInstructions && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', border: 'none',
                    justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{
                        padding: '40px', width: '500px', textAlign: 'center', color: 'white',
                        display: 'flex', flexDirection: 'column', gap: '20px',
                        boxShadow: '0 0 50px rgba(0, 204, 255, 0.2)'
                    }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: '2.5rem',
                            fontWeight: '300',
                            letterSpacing: '2px',
                            background: 'linear-gradient(to right, #00ccff, #ffffff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            MIND MAP AI
                        </h1>
                        <p style={{ color: '#aaa', fontSize: '1rem', lineHeight: '1.6', maxWidth: '80%' }}>
                            Navigate complex topics through an immersive, multi-dimensional knowledge graph powered by autonomous research agents.
                        </p>

                        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', borderLeft: '2px solid #00ccff' }}>
                            <p style={{ margin: '8px 0', fontSize: '0.9rem', color: '#ccc' }}><strong style={{ color: 'white' }}>TEXT MODE</strong> &nbsp;—&nbsp; Hover over {'"TEXT"'} to generate a research graph.</p>
                            <p style={{ margin: '8px 0', fontSize: '0.9rem', color: '#ccc' }}><strong style={{ color: 'white' }}>IMAGE MODE</strong> &nbsp;—&nbsp; Click {'"IMAGE"'} to analyze visual data.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#aaa' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 5px #00ff88' }}></div> OPTIMIST
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#aaa' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 5px #ff4444' }}></div> SKEPTIC
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#aaa' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffcc00', boxShadow: '0 0 5px #ffcc00' }}></div> HISTORIAN
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInstructions(false)}
                            style={{
                                padding: '12px 40px', marginTop: '20px',
                                background: 'transparent',
                                border: '1px solid #00ccff', borderRadius: '4px',
                                color: '#00ccff', fontSize: '0.9rem', letterSpacing: '2px',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            onMouseOver={e => {
                                e.target.style.background = '#00ccff';
                                e.target.style.color = '#000';
                            }}
                            onMouseOut={e => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = '#00ccff';
                            }}
                        >
                            INITIALIZE SYSTEM
                        </button>
                    </div>
                </div>
            )}

            {!showInstructions && (
                <div style={{
                    position: 'absolute', top: 20, right: 350, // Left of the detail panel
                    display: 'flex', gap: '15px', padding: '10px 20px',
                    background: 'rgba(0,0,0,0.5)', borderRadius: '30px',
                    border: '1px solid #333', pointerEvents: 'none'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#aaa' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 5px #00ff88' }}></div> OPTIMIST
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#aaa' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 5px #ff4444' }}></div> SKEPTIC
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#aaa' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffcc00', boxShadow: '0 0 5px #ffcc00' }}></div> HISTORIAN
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{
                position: 'absolute', top: 20, left: 50, zIndex: 100,
                display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start',
                padding: '20px'
            }}>
                <h2 style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginBottom: 10, letterSpacing: '4px' }}>MIND MAP AI</h2>

                <div
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={() => document.getElementById('textInputContainer').style.opacity = '1'}
                    onMouseLeave={() => {
                        if (document.activeElement !== document.getElementById('searchInput')) {
                            document.getElementById('textInputContainer').style.opacity = '0';
                        }
                    }}
                >


                    <button
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'white', fontSize: '2.5rem', fontWeight: '900',
                            cursor: 'pointer', letterSpacing: '2px',
                            fontFamily: 'Arial, sans-serif',
                            textShadow: '0 0 10px rgba(0,204,255,0.5)'
                        }}
                    >
                        text
                    </button>

                    <div id="textInputContainer" style={{
                        opacity: 0, transition: 'opacity 0.3s', marginLeft: 15,
                        display: 'flex', alignItems: 'center'
                    }}>
                        <input
                            id="searchInput"
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && performSearch(searchQuery)}
                            placeholder="Type a topic..."
                            style={{
                                padding: '15px 20px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)',
                                outline: 'none', fontSize: '1rem', width: '250px',
                                background: 'rgba(0,0,0,0.8)', color: 'white'
                            }}
                        />
                    </div>
                </div>

                <div>
                    <input
                        type="file"
                        id="imageInput"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                    />
                    <button
                        onClick={() => document.getElementById('imageInput').click()}
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'white', fontSize: '2.5rem', fontWeight: '900',
                            cursor: 'pointer', letterSpacing: '2px',
                            fontFamily: 'Arial, sans-serif',
                            textShadow: '0 0 10px rgba(191,0,255,0.5)'
                        }}
                    >
                        image
                    </button>

                    {/* AUTO-PILOT TOGGLE */}
                    <button
                        onClick={() => setIsAutoPilot(!isAutoPilot)}
                        style={{
                            padding: '10px 15px',
                            background: isAutoPilot ? '#00ccff' : 'rgba(0,0,0,0.5)',
                            border: '1px solid #00ccff',
                            borderRadius: '2px',
                            color: isAutoPilot ? '#000' : '#00ccff',
                            fontSize: '0.7rem',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            marginRight: '10px',
                            boxShadow: isAutoPilot ? '0 0 15px rgba(0,204,255,0.3)' : 'none'
                        }}
                        title="Enable Autonomous Research"
                    >
                        {isAutoPilot ? "AGENT: ONLINE" : "AGENT: OFFLINE"}
                    </button>
                </div>
            </div>

            {selectedNode && (
                <div className="glass-panel" style={{
                    position: 'absolute', top: 20, right: 20, width: '350px',
                    padding: '0',
                    background: 'rgba(5, 5, 10, 0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white', zIndex: 100,
                    overflow: 'hidden',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    backdropFilter: 'blur(12px)'
                }}>


                    {/* --- NEW: VISUAL HEADER --- */}
                    <div style={{
                        width: '100%',
                        height: nodeImage ? '180px' : '0px', // Animate height if image exists
                        background: '#000',
                        transition: 'height 0.3s ease',
                        position: 'relative',
                        borderBottom: nodeImage ? '1px solid #00ccff' : 'none'
                    }}>
                        {nodeImage && (
                            <img
                                src={nodeImage}
                                alt="Topic Visualization"
                                onError={(e) => {
                                    console.error("Image failed to load:", nodeImage);
                                    e.target.style.display = 'none';
                                    // wrapper div will collapse if we don't handle this,
                                    // but hiding the broken icon is better than a broken icon.
                                }}
                                referrerPolicy="no-referrer"
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover', opacity: 0.8,
                                    display: 'block'
                                }}
                            />
                        )}
                        {/* Close Button overlaps the image */}
                        <button
                            onClick={() => setSelectedNode(null)}
                            style={{
                                position: 'absolute', top: 10, right: 10,
                                background: 'rgba(0,0,0,0.6)', border: 'none',
                                color: 'white', cursor: 'pointer', borderRadius: '50%',
                                width: '30px', height: '30px', zIndex: 10
                            }}
                        >✕</button>
                    </div>

                    {/* --- EXISTING CONTENT (Padding added here) --- */}
                    <div style={{ padding: '20px' }}>
                        {/* If no image, show close button here */}
                        {!nodeImage && (
                            <button onClick={() => { setSelectedNode(null); setPendingResearchNode(null); }} style={{ float: 'right', background: 'transparent', border: 'none', color: '#666' }}>✕</button>
                        )}

                        <h2 style={{ marginTop: 0, color: selectedNode.color }}>{selectedNode.name}</h2>

                        {pendingResearchNode && pendingResearchNode.id === selectedNode.id && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '14px',
                                border: '1px solid rgba(0,204,255,0.25)',
                                borderRadius: '8px',
                                background: 'rgba(0,204,255,0.08)'
                            }}>
                                <p style={{ margin: '0 0 12px 0', lineHeight: '1.5', fontSize: '0.9rem', color: '#d8f7ff' }}>
                                    Research this node now, or keep the current map as-is?
                                </p>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => {
                                            setPendingResearchNode(null);
                                            performSearch(selectedNode.name, selectedNode.id);
                                        }}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '5px',
                                            border: '1px solid #00ccff',
                                            background: '#00ccff',
                                            color: '#000011',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Research this node
                                    </button>

                                    <button
                                        onClick={() => setPendingResearchNode(null)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '5px',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            background: 'transparent',
                                            color: '#ddd',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Keep map as is
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Your Existing Summary */}
                        <p style={{ lineHeight: '1.6', fontSize: '0.9rem', color: '#ddd' }}>
                            {selectedNode.desc || "No description available."}
                        </p>

                        {/* Your Existing Link */}
                        <a
                            href={selectedNode.url || `https://www.google.com/search?q=${selectedNode.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block', marginTop: '10px',
                                color: '#000011', background: selectedNode.color,
                                padding: '8px 15px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold'
                            }}
                        >
                            {selectedNode.url ? "Read Article ↗" : "Search Google ↗"}
                        </a>
                    </div>
                </div>
            )}

            {/* --- COLLAPSIBLE AGENT TERMINAL --- */}
            {agentThoughts.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    width: isTerminalOpen ? '600px' : 'auto', // Auto width when minimized
                    zIndex: 150,
                    transition: 'all 0.3s ease'
                }}>
                    {/* 1. HEADER / TOGGLE BUTTON */}
                    <button
                        onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: 'rgba(5, 5, 10, 0.95)',
                            border: '1px solid #333',
                            borderBottom: isTerminalOpen ? 'none' : '1px solid #333',
                            borderRadius: isTerminalOpen ? '4px 4px 0 0' : '4px',
                            color: '#00ccff',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            outline: 'none'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            SYSTEM LOG
                            {/* Pulse animation when active */}
                            <span style={{
                                width: '6px', height: '6px', background: '#00ccff',
                                boxShadow: '0 0 8px #00ccff', animation: 'pulse 1s infinite'
                            }} />
                        </span>

                        {/* Chevron Icon */}
                        <span style={{ fontSize: '0.7rem' }}>{isTerminalOpen ? 'MINIMIZE' : 'EXPAND'}</span>
                    </button>

                    {/* 2. THE LOGS (Hidden when minimized) */}
                    {isTerminalOpen && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid #333',
                            borderTop: 'none',
                            borderRadius: '0 0 4px 4px',
                            padding: '15px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                        }}>
                            {agentThoughts.map((thought, i) => (
                                <div key={i} style={{
                                    color: '#eee',
                                    fontFamily: 'Courier New, monospace',
                                    fontSize: '13px',
                                    padding: '5px 10px',
                                    borderLeft: '2px solid rgba(0,204,255,0.3)',
                                    marginBottom: '4px',
                                    animation: 'fadeIn 0.3s forwards'
                                }}>
                                    <span style={{ color: '#00ccff', marginRight: '8px', opacity: 0.5 }}>$</span>
                                    {thought.replace(/🚀|✅|❌|⚡/g, '')}
                                </div>
                            ))}
                        </div>
                    )}

                    <style jsx>{`
                        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                        @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
                    `}</style>
                </div>
            )}

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                backgroundColor="#000011"
                linkOpacity={0.2}
                nodeResolution={16}
                onBackgroundClick={() => {
                    setSelectedNode(null);
                    setPendingResearchNode(null);
                }}
                nodeThreeObjectExtend={false}
                nodeThreeObject={nodeThreeObject}

                onNodeDragEnd={node => {
                    node.fx = node.x;
                    node.fy = node.y;
                    node.fz = node.z;
                }}

                d3Force={('charge', (force) => {
                    if (force) force.strength(-150);
                })}

                onNodeClick={node => {
                    // 1. Move Camera (Keep existing)
                    const distance = 40;
                    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
                    fgRef.current.cameraPosition(
                        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                        node,
                        3000
                    );

                    // 2. Set Basic Info IMMEDIATELY (So summary/url show up instantly)
                    setSelectedNode(node);
                    setNodeImage(null); // Clear previous image

                    // 3. Fetch Image in Background
                    console.log("Fetching image for:", node.name);
                    fetch(`${API_URL}/get-node-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: node.name })
                    })
                        .then(res => res.json())
                        .then(data => {
                            console.log("Image data received:", data);
                            setNodeImage(data.image);
                        })
                        .catch(err => console.error("Image fetch failed", err));

                    // 4. Auto-Pilot Check (Keep existing)
                    if (!isAutoPilot) {
                        const hasExistingMap = graphData.nodes.length > 0;

                        if (hasExistingMap) {
                            setPendingResearchNode(node);
                            return;
                        }

                        performSearch(node.name, node.id);
                    }
                }}
            />
        </div>
    );
}