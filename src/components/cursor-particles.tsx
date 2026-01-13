"use client";

import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
    decay: number;
}

const COLORS = ["#2E4A3B", "#3D5C4A", "#4A6B58", "#E59889", "#D88A7C", "#E8EFE0"];
const MAX_PARTICLES = 100;
const PARTICLES_PER_MOVE = 2;

export function CursorParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>(0);

    const createParticle = (x: number, y: number): Particle => {
        return {
            x,
            y,
            vx: (Math.random() - 0.5) * 2, // Random horizontal drift
            vy: -(Math.random() * 2 + 1), // Upward velocity (antigravity)
            size: Math.random() * 3 + 3, // 3-6px
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            opacity: 1,
            decay: Math.random() * 0.01 + 0.01, // Fade rate
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Spawn particles at cursor
            if (particlesRef.current.length < MAX_PARTICLES) {
                for (let i = 0; i < PARTICLES_PER_MOVE; i++) {
                    particlesRef.current.push(
                        createParticle(
                            e.clientX + (Math.random() - 0.5) * 10,
                            e.clientY + (Math.random() - 0.5) * 10
                        )
                    );
                }
            }
        };

        const animate = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter((particle) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.opacity -= particle.decay;

                // Skip dead particles
                if (particle.opacity <= 0) return false;

                // Draw particle with blur effect
                ctx.save();
                ctx.globalAlpha = particle.opacity;
                ctx.filter = "blur(1px)";
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();
                ctx.restore();

                return true;
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("mousemove", handleMouseMove);

        // Start animation loop
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 9999 }}
        />
    );
}
