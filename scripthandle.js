
window.addEventListener("load", () => {
  function lerp (start, end, amt){
      return (1 - amt) * start + amt * end *.5;
  }
  
  // we will keep track of all our planes in an array
  const planes = [];
  let scrollEffect = 0;
  var planesDeformations = 0


  // get our planes elements
  const planeElements = document.getElementsByClassName("plane");

  // handle smooth scroll and update planes positions
  const smoothScroll = new LocomotiveScroll({
      el: document.getElementById('page-content'),
      smooth: true,
      inertia: 0.5,
      passive: true,
  });

  const useNativeScroll = smoothScroll.isMobile;

  // set up our WebGL context and append the canvas to our wrapper
  const curtains = new Curtains({
      container: "canvas",
      watchScroll: useNativeScroll, // watch scroll on mobile not on desktop since we're using locomotive scroll
      pixelRatio: Math.min(1.5, window.devicePixelRatio) // limit pixel ratio for performance
  });



  curtains.onRender(() => {
      if(useNativeScroll) {
          // update our planes deformation
          // increase/decrease the effect
          planesDeformations = lerp(planesDeformations, 5, 0.075);
          scrollEffect = lerp(scrollEffect, 5, 0.075);
      }
  }).onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = curtains.getScrollDeltas();

      // invert value for the effect
      delta.y = -delta.y;

      // threshold
      if(delta.y > 60) {
          delta.y = 60;
      }
      else if(delta.y < -60) {
          delta.y = -60;
      }
      if(Math.abs(delta.y) > Math.abs(planesDeformations)) {
          planesDeformations = lerp(planesDeformations, delta.y, 0.5);
      }
    
      if(Math.abs(delta.y) > Math.abs(scrollEffect)) {
          scrollEffect = lerp(scrollEffect, delta.y, 0.5);
      }

  }).onError(() => {
      // we will add a class to the document body to display original images
      document.body.classList.add("no-curtains", "planes-loaded");
  }).onContextLost(() => {
      // on context lost, try to restore the context
      curtains.restoreContext();
  });

  function updateScroll(xOffset, yOffset) {
      // update our scroll manager values
      curtains.updateScrollValues(xOffset, yOffset);
  }

  // custom scroll event
  if(!useNativeScroll) {
      // we'll render only while lerping the scroll
      curtains.disableDrawing();
      smoothScroll.on('scroll', (obj) => {
          updateScroll(obj.scroll.x, obj.scroll.y);

          // render scene
          curtains.needRender();
      });
  }

  // keep track of the number of plane we're currently drawing
  const debugElement = document.getElementById("debug-value");
  // we need to fill the counter with all our planes
  let planeDrawn = planeElements.length;

  const vs = `
  precision mediump float;
  
  // default mandatory variables
  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uMVMatrix;
  uniform mat4 uPMatrix;

  uniform mat4 planeTextureMatrix;

  // custom variables
  varying vec3 vVertexPosition;
  varying vec2 vTextureCoord;

  uniform float uPlaneDeformation;

  void main() {
      vec3 vertexPosition = aVertexPosition;

      // cool effect on scroll
      vertexPosition.x -= sin(((vertexPosition.y + 1.0) / 2.0) * 3.141592) * (sin(uPlaneDeformation / 50.0));

      gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

      // varyings
      vVertexPosition = vertexPosition;
      vTextureCoord = (planeTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
  }
`;


  const fs = `
  precision mediump float;
  
  varying vec3 vVertexPosition;
  varying vec2 vTextureCoord;

  uniform sampler2D planeTexture;

  void main() {
      // just display our texture
      gl_FragColor = texture2D(planeTexture, vTextureCoord);
  }
`;


  const params = {
      vertexShader: vs,
      fragmentShader: fs,
      shareProgram: true, // share planes program to improve plane creation speed
      widthSegments: 10,
      heightSegments: 10,
      drawCheckMargins: {
          top: 100,
          right: 0,
          bottom: 100,
          left: 0,
      },
      uniforms: {
          planeDeformation: {
              name: "uPlaneDeformation",
              type: "1f",
              value: 0,
          },
      }
  };

  // add our planes and handle them
  for(let i = 0; i < planeElements.length; i++) {
      const plane = new Plane(curtains, planeElements[i], params);

      planes.push(plane);

      handlePlanes(i);
  }






  // handle all the planes
  function handlePlanes(index) {
      const plane = planes[index];



// check if our plane is defined and use it
plane && plane.onLoading(function () {
  //console.log(plane.loadingManager.sourcesLoaded);
}).onReady(function () {
  plane.setRenderTarget(rgbTarget);

  // once everything is ready, display everything
  if (index === planes.length - 1) {
    document.body.classList.add("planes-loaded");
  }
}).onRender(function () {
  // update the uniform
  plane.uniforms.planeDeformation.value = planesDeformations;

  //plane.setScale(1, 1 + Math.abs(scrollEffect) / 500);
  plane.textures[0].setScale(1 + Math.abs(scrollEffect) / 500);
});
}

  var rgbFs = `
  precision mediump float;

  varying vec3 vVertexPosition;
  varying vec2 vTextureCoord;

  uniform sampler2D uRenderTexture;

  uniform float uScrollEffect;

  void main() {
      vec2 textureCoords = vTextureCoord;

      vec2 redTextCoords = vec2(vTextureCoord.x, vTextureCoord.y - uScrollEffect / 00.0);
      vec2 greenTextCoords = vec2(vTextureCoord.x, vTextureCoord.y - uScrollEffect / 0000.0);
      vec2 blueTextCoords = vec2(vTextureCoord.x, vTextureCoord.y - uScrollEffect / 0000.0);

      vec4 red = texture2D(uRenderTexture, redTextCoords);
      vec4 green = texture2D(uRenderTexture, greenTextCoords);
      vec4 blue = texture2D(uRenderTexture, blueTextCoords);

      vec4 finalColor = vec4(red.r, green.g, blue.b, min(1.0, red.a + blue.a + green.a));
      gl_FragColor = finalColor;
  }
`;

var rgbTarget = new RenderTarget(curtains);


var rgbPass = new ShaderPass(curtains,{
  fragmentShader: rgbFs,
  renderTarget: rgbTarget,
  depthTest: false, // we need to disable the depth test to display that shader pass on top of the first one
  uniforms: {
      scrollEffect: {
          name: "uScrollEffect",
          type: "1f",
          value: 0,
      },
  },
});

if(rgbPass) {
  rgbPass.onRender(function() {
      // update the uniform
      rgbPass.uniforms.scrollEffect.value = scrollEffect;
  });
}
});
 
