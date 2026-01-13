import React, { useEffect, useRef } from 'react';

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // COLORS
    trunkColor: '#523F31',     // Dark Royal Brown for the main trunk
    branchColor: '#926F2D',    // Golden Brown for the tips of branches
    vineColorStart: '#558833', // Deep Green (top of vine)
    vineColorEnd: '#99CC66',   // Light Green (bottom tip of vine)

    // STRUCTURE
    maxDepth: 5,               // How many times branches split

    // ANIMATION
    windSpeed: 0.002,          // How fast the wind cycle changes
};

const WeepingWillow = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const requestRef = useRef(null);
    const treeRef = useRef(null);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = 0;
        let height = 0;

        // ==========================================
        // UTILS
        // ==========================================
        // Simple seeded random number generator to ensure the tree looks the same every time
        let seedState = 12345; // CHOSEN SEED for the specific look
        const random = () => {
            const x = Math.sin(seedState++) * 10000;
            return x - Math.floor(x);
        };

        // ==========================================
        // CLASSES (Defined inside effect to access context/config easily)
        // ==========================================
        class Branch {
            constructor(x, y, angle, length, depth, parent) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.currentAngle = angle;
                this.length = length;
                this.depth = depth;
                this.parent = parent;
                this.children = [];
                this.vines = [];

                // Pre-calc jitter for drawing
                this.jitterOffset = (random() - 0.5) * 10 * depth;

                if (depth < CONFIG.maxDepth) {
                    const numBranches = 2 + Math.floor(random() * 2);
                    for (let i = 0; i < numBranches; i++) {
                        const newAngle = angle + (random() * 2.0 - 1.0);
                        const newLength = length * (0.75 + random() * 0.2);
                        this.children.push(new Branch(
                            this.x + Math.cos(angle) * length,
                            this.y + Math.sin(angle) * length,
                            newAngle,
                            newLength,
                            depth + 1,
                            this
                        ));
                    }

                    // EXTRA LEFT BRANCHES (Depth 0 only)
                    if (depth === 0) {
                        const extraLeft = 3;
                        for (let k = 0; k < extraLeft; k++) {
                            // Attach lower down the trunk for variety? Or at the tip? 
                            // Let's attach them near the top but pointing definitively LEFT
                            // Trunk angle is ~ -1.0. Left is ~ -PI (-3.14). 
                            // We want them pointing left/up-left. ~ -2.0 to -2.5
                            const leftAngle = -Math.PI / 2 - 0.5 - (k * 0.4);
                            this.children.push(new Branch(
                                this.x + Math.cos(angle) * length * 0.9, // Near top
                                this.y + Math.sin(angle) * length * 0.9,
                                leftAngle,
                                length * 0.8, // Slightly shorter
                                depth + 1,
                                this
                            ));
                        }
                    }

                } else {
                    const numVines = 5 + Math.floor(random() * 10);
                    for (let i = 0; i < numVines; i++) {
                        this.vines.push(new Vine(this.x, this.y, length));
                    }
                }
            }

            update(wind, t) {
                if (this.parent) {
                    this.x = this.parent.endX;
                    this.y = this.parent.endY;
                }

                // STATIC BRANCHES
                this.currentAngle = this.angle;

                this.endX = this.x + Math.cos(this.currentAngle) * this.length;
                this.endY = this.y + Math.sin(this.currentAngle) * this.length;

                this.children.forEach(c => c.update(wind, t));
                this.vines.forEach(v => v.update(this.endX, this.endY, wind, t));
            }

            draw(ctx) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(
                    (this.x + this.endX) / 2 + this.jitterOffset,
                    (this.y + this.endY) / 2,
                    this.endX,
                    this.endY
                );

                const baseWidth = (CONFIG.maxDepth - this.depth + 1);
                const lineWidth = Math.pow(baseWidth, 2.5) * 0.8;

                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';

                const grad = ctx.createLinearGradient(this.x, this.y, this.endX, this.endY);
                grad.addColorStop(0, CONFIG.trunkColor);
                grad.addColorStop(1, CONFIG.branchColor);
                ctx.strokeStyle = grad;

                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 5;

                ctx.stroke();

                ctx.shadowBlur = 0;

                this.children.forEach(c => c.draw(ctx));
                this.vines.forEach(v => v.draw(ctx));
            }
        }

        class Vine {
            constructor(x, y, parentLength) {
                this.x = x;
                this.y = y;
                this.length = 110 + random() * 270;

                // LONGER VINES ON LEFT SIDE
                if (x < width * 0.4) {
                    this.length *= 1.4; // 40% longer
                }
                this.segments = 20;
                this.segLen = this.length / this.segments;

                this.nodes = [];
                for (let i = 0; i <= this.segments; i++) {
                    this.nodes.push({ x: x, y: y + i * this.segLen, vx: 0, vy: 0 });
                }

                this.leafBaseColor = CONFIG.vineColorStart;
                this.leafTipColor = CONFIG.vineColorEnd;
                this.offset = random() * 100;

                // LEAF GENERATION (Static per vine)
                this.leaves = [];
                for (let i = 1; i < this.segments; i++) {
                    const leavesPerSeg = 3;
                    for (let j = 0; j < leavesPerSeg; j++) {
                        this.leaves.push({
                            segIndex: i,
                            t: j / leavesPerSeg,
                            length: 4 + random() * 3,
                            color: (random() > 0.5) ? this.leafBaseColor : this.leafTipColor
                        });
                    }
                }
            }

            update(rootX, rootY, wind, t) {
                this.nodes[0].x = rootX;
                this.nodes[0].y = rootY;

                const gravity = 0.8;

                for (let i = 1; i < this.nodes.length; i++) {
                    let node = this.nodes[i];
                    let prev = this.nodes[i - 1];

                    const windEffect = (wind * 30) * (i / this.segments) + Math.sin(t * 2 + i * 0.2 + this.offset) * 0.5;

                    node.x += windEffect;
                    node.y += gravity;

                    const dx = node.x - prev.x;
                    const dy = node.y - prev.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 0) {
                        const diff = this.segLen - dist;
                        const percent = diff / dist / 1.5;
                        const offsetX = dx * percent;
                        const offsetY = dy * percent;

                        node.x += offsetX;
                        node.y += offsetY;
                    }
                }
            }

            draw(ctx) {
                // Stem
                ctx.beginPath();
                ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
                for (let i = 1; i < this.nodes.length; i++) {
                    ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
                }
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = '#554433';
                ctx.stroke();

                // Leaves (Pre-generated)
                this.leaves.forEach(leaf => {
                    const i = leaf.segIndex;
                    const curr = this.nodes[i];
                    const prev = this.nodes[i - 1];
                    const dx = curr.x - prev.x;
                    const dy = curr.y - prev.y;
                    const lx = prev.x + dx * leaf.t;
                    const ly = prev.y + dy * leaf.t;

                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx, ly + leaf.length);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = leaf.color;
                    ctx.stroke();
                });
            }
        }

        const initTree = () => {
            if (!width || !height) return;
            seedState = 8675309; // FIXED SEED RESET ON INIT
            // Position: Bottom Left
            const startX = width * 0.0;
            const startY = height * 0.9;

            treeRef.current = new Branch(startX, startY, -Math.PI / 2 + 0.5, 160, 0, null);
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            timeRef.current += CONFIG.windSpeed;
            const windForce = Math.sin(timeRef.current) * 0.05 + 0.02;

            if (treeRef.current) {
                treeRef.current.update(windForce, timeRef.current);
                treeRef.current.draw(ctx);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                // Get parent dimensions
                const rect = containerRef.current.getBoundingClientRect();
                width = rect.width;
                height = rect.height;

                // console.log('WeepingWillow Resize:', width, height); // DEBUG

                // Update canvas real size
                canvasRef.current.width = width;
                canvasRef.current.height = height;

                initTree();
            }
        };

        // Initialize and Start
        window.addEventListener('resize', handleResize);
        // Use setTimeout to ensure DOM is ready
        setTimeout(handleResize, 100);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="weeping-willow-container"
            style={{
                position: 'fixed', // Fixed to cover viewport
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.9,
                // border: '2px solid red', // DEBUG BORDER
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default WeepingWillow;
