"use client";

import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

/** Mesmos paths do componente LionHead (viewBox 64×64). */
const LION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<path fill="#ffffff" d="M32 3 38 9 46 6 48 14 56 15 54 23 61 28 55 34 59 42 51 44 50 52 42 51 37 58 32 53 27 58 22 51 14 52 13 44 5 42 9 34 3 28 10 23 8 15 16 14 18 6 26 9Z"/>
<path fill="#000000" d="M32 15 44 21 45 34 39 45 32 49 25 45 19 34 20 21Z"/>
<path fill="#ffffff" d="M32 18 41.5 22.5 42.5 33.5 37.5 42.5 32 45.5 26.5 42.5 21.5 33.5 22.5 22.5Z"/>
<path fill="#000000" d="M24.5 28.5 30 30.5 29 32.5 25 31Z"/>
<path fill="#000000" d="M39.5 28.5 34 30.5 35 32.5 39 31Z"/>
<path fill="#000000" d="M28 36h8l-4 4.5Z"/>
</svg>`;

type Layer = { geometry: THREE.ExtrudeGeometry; dark: boolean; z: number };

function useLionLayers(): Layer[] {
  return useMemo(() => {
    const data = new SVGLoader().parse(LION_SVG);
    return data.paths.map((path, index) => {
      const shapes = path.toShapes();
      const dark = path.color.getHex() === 0x000000;
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: 2.4,
        bevelEnabled: true,
        bevelThickness: 0.6,
        bevelSize: 0.35,
        bevelSegments: 3,
        curveSegments: 6,
      });
      // mantém as posições relativas entre as camadas (centro do viewBox)
      geometry.translate(-32, -31, 0);
      return { geometry, dark, z: index * 1.0 };
    });
  }, []);
}

function useShieldGeometry() {
  return useMemo(() => {
    // Escudo heráldico com topo em "telhado", como o emblema oficial
    const s = new THREE.Shape();
    s.moveTo(0, 46);
    s.lineTo(38, 30);
    s.lineTo(38, -6);
    s.quadraticCurveTo(36, -30, 0, -50);
    s.quadraticCurveTo(-36, -30, -38, -6);
    s.lineTo(-38, 30);
    s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0, 39);
    hole.lineTo(31, 26);
    hole.lineTo(31, -5);
    hole.quadraticCurveTo(29.5, -25, 0, -42);
    hole.quadraticCurveTo(-29.5, -25, -31, -5);
    hole.lineTo(-31, 26);
    hole.closePath();
    s.holes.push(hole);
    const rim = new THREE.ExtrudeGeometry(s, {
      depth: 5,
      bevelEnabled: true,
      bevelThickness: 1.2,
      bevelSize: 1,
      bevelSegments: 4,
      curveSegments: 24,
    });
    rim.translate(0, 2, -3);

    const inner = new THREE.Shape(hole.getPoints(48));
    const plate = new THREE.ExtrudeGeometry(inner, { depth: 2, bevelEnabled: false, curveSegments: 24 });
    plate.translate(0, 2, -1.5);
    return { rim, plate };
  }, []);
}

function Medallion({ progress, size }: { progress?: RefObject<number>; size: number }) {
  const group = useRef<THREE.Group>(null);
  const layers = useLionLayers();
  const { rim, plate } = useShieldGeometry();

  const chrome = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#e4e6e9", metalness: 0.92, roughness: 0.22, clearcoat: 0.6 }),
    [],
  );
  const steel = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#9a9ea5", metalness: 0.95, roughness: 0.3 }),
    [],
  );
  const onyx = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#16181b", metalness: 0.7, roughness: 0.4, clearcoat: 1 }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const p = progress?.current ?? 0;
    const pointer = state.pointer;
    const targetY = pointer.x * 0.35 + p * Math.PI * 2;
    const targetX = -pointer.y * 0.2 + Math.sin(p * Math.PI) * 0.25;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 4, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 4, delta);
  });

  return (
    <group ref={group} scale={size}>
      <mesh geometry={rim} material={steel} />
      <mesh geometry={plate} material={onyx} position-z={-0.5} />
      <group position-z={0.5} scale={[0.95, -0.95, 0.95]}>
        {layers.map((layer, i) => (
          <mesh key={i} geometry={layer.geometry} material={layer.dark ? onyx : chrome} position-z={layer.z} />
        ))}
      </group>
    </group>
  );
}

export type LionMedallionProps = {
  /** Progresso de scroll 0..1 (opcional) que gira o medalhão */
  progress?: RefObject<number>;
  /** Pausa a renderização quando fora da tela */
  active?: boolean;
  particles?: boolean;
  /** Escala do medalhão na cena */
  size?: number;
};

export default function LionMedallionCanvas({
  progress,
  active = true,
  particles = true,
  size = 0.03,
}: LionMedallionProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 35 }}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 5]} intensity={2.2} />
      <spotLight position={[4, 6, 6]} angle={0.4} penumbra={1} intensity={60} color="#ffffff" />
      <pointLight position={[-5, -2, 3]} intensity={12} color="#9aa0a8" />
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.6}>
        <Medallion progress={progress} size={size} />
      </Float>
      {particles && <Sparkles count={70} scale={[9, 6, 4]} size={1.6} speed={0.25} opacity={0.5} color="#ffffff" />}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -2]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={2} position={[4, 1, 3]} scale={2} />
        {/* luz frontal: superfícies voltadas à câmera refletem o que está atrás dela */}
        <Lightformer form="rect" intensity={2.2} position={[0, 1.5, 7]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, -3, 6]} scale={[10, 1, 1]} />
      </Environment>
    </Canvas>
  );
}
