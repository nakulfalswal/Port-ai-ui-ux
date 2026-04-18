/* eslint-disable react/no-unknown-property */
// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import './LanyardBadge.css';

extend({ MeshLineGeometry, MeshLineMaterial });

interface UserLanyardBadgeProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
}

export default function UserLanyardBadge({ userName, userEmail, avatarUrl }: UserLanyardBadgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="lanyard-badge-wrapper">
      {/* Dismiss button */}
      <button
        className="lanyard-badge-dismiss"
        onClick={() => setDismissed(true)}
        title="Dismiss"
      >
        ✕
      </button>

      <Canvas
        camera={{ position: [0, 0, 12], fov: 22 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={[0, -30, 0]} timeStep={1 / 60}>
          <BadgeBand userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={5} color="#4f8fff" position={[-5, 0, 6]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[50, 5, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

function BadgeBand({ maxSpeed = 40, minSpeed = 0, userName = 'User', userEmail = '', avatarUrl = '' }: any) {
  const band = useRef<any>(null);
  const fixed = useRef<any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: any = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  const [curve] = useState<any>(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState<any>(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 0.8, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      if (band.current) {
        band.current.geometry.setPoints(curve.getPoints(24));
      }
      ang.copy(card.current?.angvel() || new THREE.Vector3());
      rot.copy(card.current?.rotation() || new THREE.Vector3());
      card.current?.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';

  // Initial text for name (max 12 chars)
  const displayName = (userName || 'User').slice(0, 14);
  const initials = (userName || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <group position={[0, 2.5, 0]}>
        {/* Fixed anchor */}
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.3, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.05]} />
        </RigidBody>
        <RigidBody position={[0.6, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.05]} />
        </RigidBody>
        <RigidBody position={[0.9, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.05]} />
        </RigidBody>

        {/* Card */}
        <RigidBody
          position={[1.2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.55, 0.75, 0.025]} />
          <group
            scale={1}
            position={[0, -0.6, -0.025]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => (
              (e.target as any)?.releasePointerCapture(e.pointerId), drag(false)
            )}
            onPointerDown={(e) => (
              (e.target as any)?.setPointerCapture(e.pointerId),
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              )
            )}
          >
            {/* Card base — dark glass look */}
            <mesh>
              <boxGeometry args={[1.1, 1.55, 0.04]} />
              <meshPhysicalMaterial
                color="#0a0a0f"
                clearcoat={1}
                clearcoatRoughness={0.1}
                roughness={0.2}
                metalness={0.3}
                emissive="#0a1a3a"
                emissiveIntensity={0.3}
              />
            </mesh>

            {/* Top gradient stripe */}
            <mesh position={[0, 0.65, 0.021]}>
              <planeGeometry args={[1.1, 0.25]} />
              <meshBasicMaterial color="#4f8fff" transparent opacity={0.9} />
            </mesh>

            {/* Avatar circle */}
            <mesh position={[0, 0.3, 0.022]}>
              <circleGeometry args={[0.22, 32]} />
              <meshBasicMaterial color="#1a2a4a" />
            </mesh>
            {/* Avatar ring */}
            <mesh position={[0, 0.3, 0.021]}>
              <ringGeometry args={[0.22, 0.25, 32]} />
              <meshBasicMaterial color="#4f8fff" />
            </mesh>
            {/* Initials letter placeholder (circle + color) */}
            <mesh position={[0, 0.3, 0.023]}>
              <circleGeometry args={[0.18, 32]} />
              <meshBasicMaterial color="#34d399" />
            </mesh>

            {/* Name bar */}
            <mesh position={[0, -0.05, 0.021]}>
              <planeGeometry args={[0.85, 0.1]} />
              <meshBasicMaterial color="white" transparent opacity={0.9} />
            </mesh>

            {/* Role label bar */}
            <mesh position={[0, -0.22, 0.021]}>
              <planeGeometry args={[0.65, 0.07]} />
              <meshBasicMaterial color="#4f8fff" transparent opacity={0.6} />
            </mesh>

            {/* Bottom accent line */}
            <mesh position={[0, -0.65, 0.021]}>
              <planeGeometry args={[1.1, 0.04]} />
              <meshBasicMaterial color="#34d399" transparent opacity={0.7} />
            </mesh>

            {/* Clip at top */}
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.2, 0.12, 0.06]} />
              <meshStandardMaterial color="#888888" metalness={1} roughness={0.2} />
            </mesh>
          </group>
        </RigidBody>
      </group>

      {/* Lanyard band */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#4f8fff"
          depthTest={false}
          resolution={[1000, 1000]}
          useMap={false}
          lineWidth={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
    </>
  );
}
