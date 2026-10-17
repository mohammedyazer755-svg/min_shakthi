import React, { useRef, useEffect, useState } from 'react';
import { Renderer, Camera, Transform, Program, Mesh, Box, Cylinder } from 'ogl';
import { EnergyMeterStatic } from './EnergyMeterStatic';
import { getEffectiveReducedMotion } from '../../motion';

export interface EnergyMeter3DProps {
  className?: string;
  size?: number;
}

const VERT_SHADER = /* glsl */ `
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 pos = modelViewMatrix * vec4(position, 1.0);
    vPosition = pos.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * pos;
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uMetallic;
  uniform float uRoughness;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 eyeDir = normalize(-vPosition);

    // Warm key light (top-left)
    vec3 lightDir1 = normalize(vec3(0.5, 0.8, 1.0));
    float diff1 = max(dot(normal, lightDir1), 0.0);
    vec3 half1 = normalize(lightDir1 + eyeDir);
    float spec1 = pow(max(dot(normal, half1), 0.0), 32.0 * (1.0 - uRoughness));

    // Cool rim light (bottom-right)
    vec3 lightDir2 = normalize(vec3(-0.6, -0.4, 0.5));
    float diff2 = max(dot(normal, lightDir2), 0.0) * 0.35;

    // Ambient warm tone
    vec3 ambient = vec3(0.04, 0.035, 0.03);

    // Warm gold specular highlight
    vec3 specColor = mix(vec3(1.0), vec3(0.78, 0.66, 0.43), uMetallic);
    vec3 diffuse = uColor * (diff1 * 0.85 + diff2);
    vec3 specular = specColor * spec1 * (uMetallic * 0.9 + 0.1);

    vec3 finalColor = ambient + diffuse + specular;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const EnergyMeter3D: React.FC<EnergyMeter3DProps> = ({
  className = '',
  size = 380,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hasContextError, setHasContextError] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!containerRef.current || hasContextError) return;

    let isCancelled = false;
    let animId: number | null = null;
    let renderer: Renderer | null = null;
    let glContext: WebGLRenderingContext | null = null;

    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = getEffectiveReducedMotion();

    try {
      const isMobile = window.innerWidth < 768;
      const dprCap = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5);

      renderer = new Renderer({
        dpr: dprCap,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });

      const gl = renderer.gl;
      glContext = gl;

      // Handle WebGL context loss
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        console.warn('[3D METER] WebGL context lost; falling back to vector art.');
        setHasContextError(true);
      };
      gl.canvas.addEventListener('webglcontextlost', handleContextLost, false);

      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      gl.canvas.style.position = 'absolute';
      gl.canvas.style.top = '0';
      gl.canvas.style.left = '0';
      gl.canvas.style.pointerEvents = 'none';

      // Clear existing children
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      // Camera setup
      const camera = new Camera(gl, { fov: 35 });
      camera.position.set(0, 0, 6.2);

      // Root scene graph
      const scene = new Transform();
      const meterGroup = new Transform();
      meterGroup.setParent(scene);

      // Chassis: Dark Anodized Box
      const chassisGeom = new Box(gl, { width: 2.1, height: 2.4, depth: 0.45 });
      const chassisProg = new Program(gl, {
        vertex: VERT_SHADER,
        fragment: FRAG_SHADER,
        uniforms: {
          uColor: { value: [0.07, 0.07, 0.09] }, // Deep dark grey
          uMetallic: { value: 0.8 },
          uRoughness: { value: 0.3 },
        },
      });
      const chassisMesh = new Mesh(gl, { geometry: chassisGeom, program: chassisProg });
      chassisMesh.position.set(0, 0, 0);
      chassisMesh.setParent(meterGroup);

      // Brass Circular Bezel
      const bezelGeom = new Cylinder(gl, {
        radiusTop: 0.78,
        radiusBottom: 0.78,
        height: 0.12,
        radialSegments: 36,
      });
      const bezelProg = new Program(gl, {
        vertex: VERT_SHADER,
        fragment: FRAG_SHADER,
        uniforms: {
          uColor: { value: [0.78, 0.66, 0.43] }, // Warm brass
          uMetallic: { value: 0.95 },
          uRoughness: { value: 0.15 },
        },
      });
      const bezelMesh = new Mesh(gl, { geometry: bezelGeom, program: bezelProg });
      bezelMesh.rotation.x = Math.PI / 2; // Face forward
      bezelMesh.position.set(0, 0.15, 0.28);
      bezelMesh.setParent(meterGroup);

      // Dark Dial Face
      const dialGeom = new Cylinder(gl, {
        radiusTop: 0.72,
        radiusBottom: 0.72,
        height: 0.08,
        radialSegments: 36,
      });
      const dialProg = new Program(gl, {
        vertex: VERT_SHADER,
        fragment: FRAG_SHADER,
        uniforms: {
          uColor: { value: [0.03, 0.03, 0.04] }, // Pitch dark face
          uMetallic: { value: 0.2 },
          uRoughness: { value: 0.6 },
        },
      });
      const dialMesh = new Mesh(gl, { geometry: dialGeom, program: dialProg });
      dialMesh.rotation.x = Math.PI / 2;
      dialMesh.position.set(0, 0.15, 0.32);
      dialMesh.setParent(meterGroup);

      // Golden Indicator Needle
      const needleGeom = new Box(gl, { width: 0.035, height: 0.52, depth: 0.02 });
      const needleProg = new Program(gl, {
        vertex: VERT_SHADER,
        fragment: FRAG_SHADER,
        uniforms: {
          uColor: { value: [0.88, 0.72, 0.45] }, // Highlighted gold
          uMetallic: { value: 1.0 },
          uRoughness: { value: 0.1 },
        },
      });
      const needleMesh = new Mesh(gl, { geometry: needleGeom, program: needleProg });
      needleMesh.position.set(0.12, 0.28, 0.37);
      needleMesh.rotation.z = -0.45; // resting at 50Hz position
      needleMesh.setParent(meterGroup);

      // Lower Terminal Connectors (Brass Lugs)
      for (let i = -1; i <= 1; i++) {
        const lugGeom = new Box(gl, { width: 0.25, height: 0.18, depth: 0.12 });
        const lugMesh = new Mesh(gl, { geometry: lugGeom, program: bezelProg });
        lugMesh.position.set(i * 0.55, -1.24, 0.05);
        lugMesh.setParent(meterGroup);
      }

      // Responsive placement
      const updateSize = () => {
        if (!containerRef.current || !renderer) return;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h);
        camera.perspective({ aspect: w / h });
      };

      window.addEventListener('resize', updateSize);
      updateSize();

      // Settling Entrance & Subtle Pointer Response
      const startTime = performance.now();
      const entranceDuration = 600; // 500-650ms per budget
      let currentTiltX = 0;
      let currentTiltY = 0;
      let targetTiltX = 0;
      let targetTiltY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        if (isTouch || prefersReduced || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5; // [-0.5, 0.5]
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        // Cap tilt at ~3 degrees (0.052 rad)
        targetTiltY = nx * 0.06;
        targetTiltX = -ny * 0.06;
      };

      if (!isTouch && !prefersReduced) {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
      }

      // Intersection & Document Visibility
      let isVisible = true;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisible = entry ? entry.isIntersecting : true;
        },
        { threshold: 0.05 }
      );
      observer.observe(containerRef.current);

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isVisible = false;
        } else if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Render Loop
      const render = (time: number) => {
        if (isCancelled) return;

        if (!isVisible || isPausedRef.current) {
          animId = requestAnimationFrame(render);
          return;
        }

        // Settling entrance curve
        const elapsed = time - startTime;
        let progress = Math.min(elapsed / entranceDuration, 1.0);
        // Smooth cubic deceleration
        progress = 1.0 - Math.pow(1.0 - progress, 3.0);

        if (prefersReduced) {
          meterGroup.rotation.x = 0.04;
          meterGroup.rotation.y = 0.0;
        } else {
          // Initial rotation settling into resting pose
          const initRx = 0.22;
          const initRy = -0.28;
          const restRx = 0.04;
          const restRy = 0.0;

          // Smooth pointer interpolation
          currentTiltX = currentTiltX * 0.94 + targetTiltX * 0.06;
          currentTiltY = currentTiltY * 0.94 + targetTiltY * 0.06;

          meterGroup.rotation.x = (initRx * (1.0 - progress) + restRx * progress) + currentTiltX;
          meterGroup.rotation.y = (initRy * (1.0 - progress) + restRy * progress) + currentTiltY;

          // Subtle idling float (sub-pixel oscillation)
          if (progress >= 1.0) {
            meterGroup.position.y = Math.sin(time * 0.0012) * 0.02;
          }
        }

        if (renderer) {
          renderer.render({ scene, camera });
        }
        animId = requestAnimationFrame(render);
      };

      // Initial single frame if reduced motion, else start loop
      if (prefersReduced) {
        meterGroup.rotation.x = 0.04;
        meterGroup.rotation.y = 0.0;
        if (renderer) {
          renderer.render({ scene, camera });
        }
      } else {
        animId = requestAnimationFrame(render);
      }

      return () => {
        isCancelled = true;
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', updateSize);
        if (!isTouch && !prefersReduced) {
          window.removeEventListener('mousemove', handleMouseMove);
        }
        observer.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (glContext) {
          glContext.canvas.removeEventListener('webglcontextlost', handleContextLost);
          const ext = glContext.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
          const canvasEl = glContext.canvas as HTMLElement;
          if (canvasEl && canvasEl.parentNode) {
            canvasEl.parentNode.removeChild(canvasEl);
          }
        }
        renderer = null;
      };
    } catch (err) {
      console.warn('[3D METER] Initialization failed:', err);
      setHasContextError(true);
    }
  }, [hasContextError]);

  if (hasContextError) {
    return <EnergyMeterStatic className={className} size={size} />;
  }

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`.trim()}
      style={{ width: '100%', maxWidth: size, aspectRatio: '1/1' }}
      aria-label="MIN-SAKTHI 3D Dimensional Energy Meter"
      role="img"
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Accessible Decorative Pause/Play Control */}
      <button
        type="button"
        onClick={() => setIsPaused((prev) => !prev)}
        className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-opacity opacity-40 hover:opacity-100"
        style={{
          background: 'rgba(10, 10, 14, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.75)',
        }}
        aria-label={isPaused ? 'Resume 3D animation' : 'Pause 3D animation'}
        title={isPaused ? 'Resume 3D animation' : 'Pause 3D animation'}
      >
        {isPaused ? '▶ Play 3D' : '⏸ Pause'}
      </button>
    </div>
  );
};

export default EnergyMeter3D;
