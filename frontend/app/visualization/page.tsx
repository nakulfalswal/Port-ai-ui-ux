'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const VisualizationPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create a sphere of "assets"
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < 500; i++) {
      const radius = 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      vertices.push(x, y, z);
      
      // Color based on position (sentiment cluster)
      colors.push(Math.random(), 0.5 + Math.random() * 0.5, 1);
      sizes.push(0.05 + Math.random() * 0.1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      points.rotation.y += 0.002;
      points.rotation.x += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <main className="pt-24 h-screen flex flex-col px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-white mb-2">3D Market Intelligence</h1>
        <p className="text-white/40 text-sm">Visualizing global asset correlations and risk clusters in real-time.</p>
      </div>
      
      <div className="flex-1 glass-panel rounded-3xl overflow-hidden relative cursor-move">
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Overlay UI */}
        <div className="absolute top-8 left-8 p-6 glass-panel rounded-2xl max-w-xs pointer-events-none">
          <h3 className="text-xs font-semibold text-white mb-4 uppercase tracking-widest">Cluster Key</h3>
          <div className="space-y-3">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-400"></div>
               <span className="text-[10px] text-white/60">Technology Assets</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
               <span className="text-[10px] text-white/60">Consumer Goods</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-purple-400"></div>
               <span className="text-[10px] text-white/60">Energy / Industrial</span>
             </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-[10px] text-white/40 mb-1">Active Nodes</div>
            <div className="text-xl font-medium text-white">4,281</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VisualizationPage;
