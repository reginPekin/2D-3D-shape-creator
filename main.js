let mode = "2D";
let shapes = [];
let animating = false;

const canvas2d = document.getElementById("canvas2d");
const canvas3d = document.getElementById("canvas3d");
const toggleBtn = document.getElementById("toggle");

document.getElementById("addCircle").onclick = () => addShape("circle");
document.getElementById("addRect").onclick = () => addShape("rect");

function addShape(type) {
  const div = document.createElement("div");
  div.classList.add("shape");
  // Random size between 30px and 120px
  const size = 30 + Math.random() * 90;
  div.style.width = `${size}px`;
  div.style.height = `${size}px`;
  div.style.background = randomColor();
  // Random position within canvas bounds
  const maxX = canvas2d.clientWidth - size;
  const maxY = canvas2d.clientHeight - size;
  div.style.left = `${Math.random() * maxX}px`;
  div.style.top = `${Math.random() * maxY}px`;
  div.style.borderRadius = type === "circle" ? "50%" : "0";
  div.setAttribute("data-type", type);

  enableDrag(div);
  canvas2d.appendChild(div);
}

function randomColor() {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 80%, 60%)`;
}

function enableDrag(el) {
  el.onmousedown = function (e) {
    if (animating) return;
    const shiftX = e.clientX - el.getBoundingClientRect().left;
    const shiftY = e.clientY - el.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      const rect = canvas2d.getBoundingClientRect();
      const maxX = rect.width - parseInt(el.style.width);
      const maxY = rect.height - parseInt(el.style.height);
      const newX = Math.min(Math.max(0, pageX - rect.left - shiftX), maxX);
      const newY = Math.min(Math.max(0, pageY - rect.top - shiftY), maxY);
      el.style.left = newX + "px";
      el.style.top = newY + "px";
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.onmouseup = function () {
      document.removeEventListener("mousemove", onMouseMove);
      document.onmouseup = null;
    };
  };

  el.ondragstart = () => false;
}

toggleBtn.onclick = () => {
  if (animating) return;

  if (mode === "2D") {
    animateToThreeJS();
    toggleBtn.classList.add("active");
  } else {
    animateToTwoD();
    toggleBtn.classList.remove("active");
  }
};

function animateToThreeJS() {
  animating = true;
  mode = "3D";
  canvas3d.style.display = "block";

  // Store canvas2d dimensions before hiding it
  const canvas2dWidth = canvas2d.clientWidth;
  const canvas2dHeight = canvas2d.clientHeight;

  // Sync canvas3d size and position with canvas2d
  canvas3d.style.position = "absolute";
  canvas3d.style.top = canvas2d.offsetTop + "px";
  canvas3d.style.left = canvas2d.offsetLeft + "px";
  canvas3d.style.width = canvas2dWidth + "px";
  canvas3d.style.height = canvas2dHeight + "px";

  const shapesElements = document.querySelectorAll(".shape");
  shapes = Array.from(shapesElements).map((el) => ({
    x: parseInt(el.style.left),
    y: parseInt(el.style.top),
    w: parseInt(el.style.width),
    h: parseInt(el.style.height),
    color: el.style.background,
    type: el.getAttribute("data-type"),
    element: el,
    canvasWidth: canvas2dWidth, // Store canvas dimensions with each shape
    canvasHeight: canvas2dHeight,
  }));

  setTimeout(() => {
    // canvas2d.style.display = "none";
    renderThreeJS();
    animating = false;
  }, 1000);
}

function animateToTwoD() {
  animating = true;
  mode = "2D";
  canvas2d.style.display = "block";

  const shapesElements = document.querySelectorAll(".shape");
  shapesElements.forEach((el) => {
    el.style.opacity = "0";
    // el.style.transform = "translateZ(100px) rotateY(-90deg)"
  });

  canvas3d.style.opacity = "0";
  canvas3d.style.transition = "opacity 1s";

  setTimeout(() => {
    canvas3d.style.display = "none";
    canvas3d.style.opacity = "1";

    shapesElements.forEach((el) => {
      el.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
      // el.style.transform = "translateZ(0) rotateY(0)";
      el.style.opacity = "1";
    });

    animating = false;
  }, 1000);
}

function renderThreeJS() {
  const scene = new THREE.Scene();

  // Switch to perspective camera for better 3D view
  const camera = new THREE.PerspectiveCamera(
    45,
    shapes[0].canvasWidth / shapes[0].canvasHeight,
    0.1,
    2000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas3d,
    alpha: true,
    antialias: true,
  });

  renderer.setSize(shapes[0].canvasWidth, shapes[0].canvasHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  // Add ambient light for better visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(0, 0, 10);
  light.castShadow = true;
  scene.add(light);

  const meshes = [];

  shapes.forEach((shape) => {
    let geometry;

    if (shape.type === "circle") {
      geometry = new THREE.SphereGeometry(shape.w / 2, 32, 32);
    } else {
      geometry = new THREE.BoxGeometry(
        shape.w,
        shape.h,
        Math.min(shape.w, shape.h)
      );
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: shape.color,
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position directly using pixel coordinates
    const x = shape.x - shapes[0].canvasWidth / 2 + shape.w / 2;
    const y = -(shape.y - shapes[0].canvasHeight / 2 + shape.h / 2);
    mesh.position.set(x, y, 0);

    scene.add(mesh);
    meshes.push(mesh);
  });

  // Initial camera position (top view)
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  let startTime = null;
  const duration = 2000; // Increased duration for smoother animation

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    // First half of animation - shapes rising
    if (progress < 0.5) {
      const riseProgress = progress * 2; // Scale to 0-1 for first half
      meshes.forEach((mesh) => {
        mesh.position.z = Math.sin(riseProgress * Math.PI) * 50;
      });
      renderer.render(scene, camera);
    }
    // Second half - camera movement
    else {
      const cameraProgress = (progress - 0.5) * 2; // Scale to 0-1 for second half

      // Move camera in an arc
      const angle = cameraProgress * Math.PI * 0.25; // 45 degrees rotation
      const radius = 500; // Keep same distance
      const height = 500 * (1 - cameraProgress * 0.3); // Gradually lower camera

      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.position.y = height;

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
