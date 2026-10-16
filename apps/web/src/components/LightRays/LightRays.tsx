import React, { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';

export interface LightRaysProps {
  raysOrigin?: 'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  distortion?: number;
  className?: string;
}

interface LightRaysUniforms {
  iTime: { value: number };
  iResolution: { value: number[] | [number, number] };
  rayPos: { value: number[] | [number, number] };
  rayDir: { value: number[] | [number, number] };
  raysSpeed: { value: number };
  lightSpread: { value: number };
  rayLength: { value: number };
  pulsating: { value: number };
  fadeDistance: { value: number };
  mousePos: { value: number[] | [number, number] };
  mouseInfluence: { value: number };
  distortion: { value: number };
}

const getAnchorAndDir = (origin: string, w: number, h: number): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left': return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right': return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left': return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right': return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left': return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center': return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right': return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

export const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'top-center',
  raysSpeed = 1,
  lightSpread = 0.5,
  rayLength = 3,
  pulsating = false,
  fadeDistance = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const uniformsRef = useRef<LightRaysUniforms | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(
        entries => {
          const entry = entries[0];
          if (entry) {
            setIsVisible(entry.isIntersecting);
          }
        },
        { threshold: 0.05 }
      );
      observerRef.current.observe(containerRef.current);
    } else {
      setIsVisible(true);
    }
    return () => {
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;
    if (cleanupFunctionRef.current) { cleanupFunctionRef.current(); cleanupFunctionRef.current = null; }
    let isCancelled = false;

    const initializeWebGL = async () => {
      if (!containerRef.current || isCancelled) return;
      await new Promise(resolve => setTimeout(resolve, 10));
      if (!containerRef.current || isCancelled) return;

      try {
        const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true });
        rendererRef.current = renderer;
        const gl = renderer.gl;
        gl.canvas.style.width = '100%';
        gl.canvas.style.height = '100%';
        gl.canvas.style.position = 'absolute';
        gl.canvas.style.top = '0';
        gl.canvas.style.left = '0';
        gl.canvas.style.pointerEvents = 'none';
        while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);
        containerRef.current.appendChild(gl.canvas);

        const vert = `attribute vec2 position;\nvoid main() { gl_Position = vec4(position, 0.0, 1.0); }`;
        const frag = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float distortion;
float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float normalizedDistance = distance / max(maxDistance, 1.0);
  float distanceWindow = 1.0 - smoothstep(0.35, 1.0, normalizedDistance);
  float inverseSquare = 1.0 / (1.0 + 10.0 * normalizedDistance * normalizedDistance);
  float fadeRadius = max(iResolution.x * fadeDistance, 1.0);
  float fadeRatio = distance / fadeRadius;
  float fadeFalloff = 1.0 / (1.0 + 4.0 * fadeRatio * fadeRatio);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );
  return baseStrength * distanceWindow * inverseSquare * fadeFalloff * spreadFactor * pulse;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  float rayA = rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  float rayB = rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  float luminance = clamp(rayA * 0.56 + rayB * 0.44, 0.0, 1.0);
  fragColor = vec4(vec3(1.0) * luminance, luminance);
}
void main() { vec4 color; mainImage(color, gl_FragCoord.xy); gl_FragColor = color; }`;

        const uniforms = {
          iTime: { value: 0 }, iResolution: { value: [1, 1] }, rayPos: { value: [0, 0] }, rayDir: { value: [0, 1] },
          raysSpeed: { value: raysSpeed }, lightSpread: { value: lightSpread }, rayLength: { value: rayLength },
          pulsating: { value: pulsating ? 1.0 : 0.0 }, fadeDistance: { value: fadeDistance },
          mousePos: { value: [0.5, 0.5] }, mouseInfluence: { value: mouseInfluence }, distortion: { value: distortion }
        };
        uniformsRef.current = uniforms;

        const geometry = new Triangle(gl);
        const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
        const mesh = new Mesh(gl, { geometry, program });
        meshRef.current = mesh;

        const updatePlacement = () => {
          if (!containerRef.current || !renderer) return;
          renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
          const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
          if (wCSS === 0 || hCSS === 0) return;
          renderer.setSize(wCSS, hCSS);
          const dpr = renderer.dpr;
          const w = wCSS * dpr; const h = hCSS * dpr;
          uniforms.iResolution.value = [w, h];
          const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
          uniforms.rayPos.value = anchor; uniforms.rayDir.value = dir;
        };

        const loop = (t: number) => {
          if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
          uniforms.iTime.value = t * 0.001;
          if (followMouse && mouseInfluence > 0.0) {
            const smoothing = 0.92;
            smoothMouseRef.current.x = smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing);
            smoothMouseRef.current.y = smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing);
            uniforms.mousePos.value = [smoothMouseRef.current.x, smoothMouseRef.current.y];
          }
          try { renderer.render({ scene: mesh }); animationIdRef.current = requestAnimationFrame(loop); }
          catch (error) { console.warn('WebGL rendering error:', error); }
        };

        window.addEventListener('resize', updatePlacement);
        updatePlacement();
        animationIdRef.current = requestAnimationFrame(loop);

        cleanupFunctionRef.current = () => {
          if (animationIdRef.current) { cancelAnimationFrame(animationIdRef.current); animationIdRef.current = null; }
          window.removeEventListener('resize', updatePlacement);
          if (renderer) {
            try {
              const canvas = renderer.gl.canvas;
              const ext = renderer.gl.getExtension('WEBGL_lose_context');
              if (ext) ext.loseContext();
              if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            } catch (err) { console.warn('WebGL cleanup error:', err); }
          }
          rendererRef.current = null; uniformsRef.current = null; meshRef.current = null;
        };
      } catch (err) { console.warn('WebGL LightRays failed to initialize:', err); }
    };

    initializeWebGL();
    return () => { isCancelled = true; if (cleanupFunctionRef.current) { cleanupFunctionRef.current(); cleanupFunctionRef.current = null; } };
  }, [isVisible, raysOrigin, raysSpeed, lightSpread, rayLength, pulsating, fadeDistance, followMouse, mouseInfluence, distortion]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current) return;
    const u = uniformsRef.current; const renderer = rendererRef.current;
    u.raysSpeed.value = raysSpeed; u.lightSpread.value = lightSpread; u.rayLength.value = rayLength;
    u.pulsating.value = pulsating ? 1.0 : 0.0; u.fadeDistance.value = fadeDistance;
    u.mouseInfluence.value = mouseInfluence; u.distortion.value = distortion;
    const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
    const dpr = renderer.dpr;
    const { anchor, dir } = getAnchorAndDir(raysOrigin, wCSS * dpr, hCSS * dpr);
    u.rayPos.value = anchor; u.rayDir.value = dir;
  }, [raysSpeed, lightSpread, raysOrigin, rayLength, pulsating, fadeDistance, mouseInfluence, distortion]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    };
    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);

  return <div ref={containerRef} className={`light-rays-container ${className}`.trim()} aria-hidden="true" />;
};

export default LightRays;
