"use client";

import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { REVO_R_PATH } from "@/components/brand/emblem";

const R_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill-rule="evenodd" d="${REVO_R_PATH}"/></svg>`;

/** "R" da marca extrudado (mesmo desenho do símbolo 2D). */
function useMonogram() {
  return useMemo(() => {
    const [path] = new SVGLoader().parse(R_SVG).paths;
    const geometry = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path!), {
      depth: 6,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 0.6,
      bevelSegments: 4,
      curveSegments: 10,
    });
    // centro do desenho (x 21–45, y 17–47) na origem
    geometry.translate(-33, -32, -3);
    return geometry;
  }, []);
}

/** Anéis orbitais: cada um gira em um eixo, como um giroscópio. */
const RINGS = [
  { radius: 30, tube: 1, speed: 0.55, tilt: [1.2, 0.2, 0], color: "#3ee6ff" },
  { radius: 35, tube: 0.75, speed: -0.38, tilt: [0.3, 1.1, 0.4], color: "#8a7dff" },
  { radius: 40, tube: 0.5, speed: 0.24, tilt: [-0.6, 0.4, 1.3], color: "#cfd6e2" },
] as const;

function Core({ progress, size }: { progress?: RefObject<number>; size: number }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const node = useRef<THREE.Mesh>(null);
  const monogram = useMonogram();

  const chrome = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#eef3f8", metalness: 0.95, roughness: 0.18, clearcoat: 0.8 }),
    [],
  );
  const ringMaterials = useMemo(
    () =>
      RINGS.map(
        (r) =>
          new THREE.MeshStandardMaterial({
            color: r.color,
            emissive: r.color,
            emissiveIntensity: r.color === "#cfd6e2" ? 0.15 : 1.6,
            metalness: 0.6,
            roughness: 0.3,
          }),
      ),
    [],
  );
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3ee6ff" }), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const p = progress?.current ?? 0;
    const pointer = state.pointer;
    const targetY = pointer.x * 0.35 + p * Math.PI * 2;
    const targetX = -pointer.y * 0.2 + Math.sin(p * Math.PI) * 0.25;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 4, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 4, delta);
    rings.current.forEach((ring, i) => {
      if (ring) ring.rotation.z += RINGS[i]!.speed * delta;
    });
    if (node.current) {
      const t = state.clock.elapsedTime * 0.9;
      node.current.position.set(Math.cos(t) * 30, Math.sin(t) * 30, 0);
    }
  });

  return (
    <group ref={group} scale={size}>
      <mesh geometry={monogram} material={chrome} scale={[0.95, -0.95, 0.95]} />
      {RINGS.map((r, i) => (
        <group key={i} rotation={r.tilt as unknown as [number, number, number]}>
          <mesh
            ref={(el) => {
              rings.current[i] = el;
            }}
            material={ringMaterials[i]}
          >
            <torusGeometry args={[r.radius, r.tube, 16, 160, Math.PI * 1.7]} />
          </mesh>
          {i === 0 && (
            <mesh ref={node} material={glow}>
              <sphereGeometry args={[2.2, 24, 24]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export type RevoCoreProps = {
  /** Progresso de scroll 0..1 (opcional) que gira o núcleo */
  progress?: RefObject<number>;
  /** Pausa a renderização quando fora da tela */
  active?: boolean;
  particles?: boolean;
  /** Escala do núcleo na cena */
  size?: number;
};

export default function RevoCoreCanvas({ progress, active = true, particles = true, size = 0.03 }: RevoCoreProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 35 }}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 5]} intensity={2} />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#3ee6ff" />
      <pointLight position={[4, 2, 2]} intensity={14} color="#8a7dff" />
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.6}>
        <Core progress={progress} size={size} />
      </Float>
      {particles && <Sparkles count={80} scale={[9, 6, 4]} size={1.6} speed={0.3} opacity={0.6} color="#3ee6ff" />}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -2]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#3ee6ff" position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={2} color="#8a7dff" position={[4, 1, 3]} scale={2} />
        {/* luz frontal: superfícies voltadas à câmera refletem o que está atrás dela */}
        <Lightformer form="rect" intensity={2.2} position={[0, 1.5, 7]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, -3, 6]} scale={[10, 1, 1]} />
      </Environment>
    </Canvas>
  );
}
