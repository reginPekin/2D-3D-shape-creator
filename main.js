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

  const shapesElements = document.querySelectorAll(".shape");
  shapes = Array.from(shapesElements).map((el) => ({
    x: parseInt(el.style.left),
    y: parseInt(el.style.top),
    w: parseInt(el.style.width),
    h: parseInt(el.style.height),
    color: el.style.background,
    type: el.getAttribute("data-type"),
    element: el,
  }));

  shapes.forEach((shape) => {
    shape.element.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
    shape.element.style.transform = "translateZ(100px) rotateY(90deg)";
    shape.element.style.opacity = "0";
  });

  setTimeout(() => {
    canvas2d.style.display = "none";
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
    el.style.transform = "translateZ(100px) rotateY(-90deg)";
  });

  canvas3d.style.opacity = "0";
  canvas3d.style.transition = "opacity 1s";

  setTimeout(() => {
    canvas3d.style.display = "none";
    canvas3d.style.opacity = "1";

    shapesElements.forEach((el) => {
      el.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform = "translateZ(0) rotateY(0)";
      el.style.opacity = "1";
    });

    animating = false;
  }, 1000);
}

function renderThreeJS() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas3d.clientWidth / canvas3d.clientHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas3d,
    alpha: true,
    antialias: true,
  });

  renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  // Add ambient light for better visibility
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  light.castShadow = true;
  scene.add(light);

  const meshes = [];
  shapes.forEach((shape) => {
    let geometry;
    const scale = shape.w / 60;

    if (shape.type === "circle") {
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
    } else {
      // For rectangles, create a cube with proportional dimensions
      const width = 1;
      const height = shape.h / shape.w;
      const depth = 1;
      geometry = new THREE.BoxGeometry(width, height, depth);
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: shape.color,
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Calculate scale to match 2D size exactly
    const scaleX = shape.w / 100;
    const scaleY = shape.h / 100;
    const scaleZ = (shape.w + shape.h) / 200; // Average of width and height for depth
    mesh.scale.set(scaleX, scaleY, scaleZ);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Adjust position to match 2D coordinates exactly
    const x = (shape.x - canvas2d.clientWidth / 2) / 100;
    const y = -(shape.y - canvas2d.clientHeight / 2) / 100;
    mesh.position.set(x, y, 0);
    mesh.rotation.y = -Math.PI / 2;

    scene.add(mesh);
    meshes.push(mesh);
  });

  // Adjust camera position to match new scale
  camera.position.z = 5;

  let startTime = null;
  const duration = 1000;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    meshes.forEach((mesh, i) => {
      mesh.rotation.y = (-Math.PI / 2) * (1 - easeProgress);
      mesh.position.z = Math.sin(easeProgress * Math.PI) * 0.5; // Reduce z-movement
      mesh.material.opacity = progress;
    });

    renderer.render(scene, camera);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
