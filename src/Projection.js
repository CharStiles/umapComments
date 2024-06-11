import React, { Component } from 'react'
import * as THREE from 'three'
import * as _ from 'lodash'
import * as d3 from 'd3'
import * as TWEEN from '@tweenjs/tween.js'

// Constants for sprite sheets
let sprite_side = 73
let sprite_size = sprite_side * sprite_side
let sprite_number = 14
let sprite_image_size = 28
// actual sprite size needs to be power of 2
let sprite_actual_size = 2048
let gPlane;

let mnist_tile_string = 'mnist_tile_solid_'
let mnist_tile_locations = [...Array(sprite_number)].map(
  (n, i) => `${process.env.PUBLIC_URL}/${mnist_tile_string}${i}.png`
)

let shaderPrevBase = `${process.env.PUBLIC_URL}/shaderPrevs/`
// let mnist_tile_string = 'shaderPrevs/'
// let mnist_tile_locations = [...Array(sprite_number)].map(
//   (n, i) => `${process.env.PUBLIC_URL}/${mnist_tile_string}${i}.png`
// )

let mnist_images = mnist_tile_locations.map(src => {
  let img = document.createElement('img')
  img.src = src
  return img
})

let shader_images =[]

let zoomScaler = input => {
  let scale1 = d3
    .scaleLinear()
    .domain([20, 5])
    .range([14, 28])
    .clamp(true)
  let scale2 = d3
    .scaleLinear()
    .domain([2, 0.1])
    .range([28, 56])
  if (input >= 5) {
    return scale1(input)
    // return 28
  } else if (input <= 2) {
    // return scale2(input)
    return 28
  } else {
    return 28
  }
}

class Projection extends Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.init = this.init.bind(this)
    this.addPoints = this.addPoints.bind(this)
    this.addText = this.addText.bind(this)
    this.handleResize = this.handleResize.bind(this)
    this.setUpCamera = this.setUpCamera.bind(this)
    this.animate = this.animate.bind(this)
    this.getScaleFromZ = this.getScaleFromZ.bind(this)
    this.getZFromScale = this.getZFromScale.bind(this)
    this.changeEmbeddings = this.changeEmbeddings.bind(this)
  }

  changeEmbeddings(prev_choice, new_choice,labels) {
    console.log(new_choice)
    console.log(this.planes)
    console.log(this.textPlane4)
    console.log(this.textPlane3)
    console.log(this.textPlane5)
    // // assumes mnist embeddings has been updated
    // for (let i = 0 ; i < this.planes.length; i++){
    //   console.log(i)

    //   if(i == new_choice){
    //     this.planes[i].visible = true;
    //   }
    //   else{
    //     this.planes[i].visible = false;
    //   } 
      
    // }

    this.textPlane4.visible = false;

    this.textPlane3.visible = false;
    this.textPlane5.visible = false;
    if (new_choice ==0 && labels == true){
      this.textPlane3.visible = true;
    }
    if (new_choice ==1&& labels == true){
      this.textPlane4.visible = true;
    }
    if (new_choice ==2&& labels == true){
      this.textPlane5.visible = true;
    }


    let ranges = []
    for (let i = 0; i < sprite_number; i++) {
      let start = i * sprite_size
      let end = (i + 1) * sprite_size
      if (i === sprite_number - 1) end = sprite_number * sprite_size
      ranges.push([start, end])
    }

    let embedding_chunks = ranges.map(range =>
      this.props[this.props.algorithm_embedding_keys[new_choice]].slice(
        range[0],
        range[1]
      )
    )

    for (let c = 0; c < sprite_number; c++) {
      let echunk = embedding_chunks[c]

      let points = this.scene.children[0].children[c]
      let numVertices = echunk.length
      let position = points.geometry.attributes.position.array
      let target = new Float32Array(numVertices * 3)
      for (let i = 0, index = 0, l = numVertices; i < l; i++, index += 3) {
        let x = echunk[i][0]
        let y = echunk[i][1]
        let z = 0
        target[index] = x
        target[index + 1] = y
        target[index + 2] = z
      }

      let tween = new TWEEN.Tween(position)
        .to(target, 1000)
        .easing(TWEEN.Easing.Linear.None)
      tween.onUpdate(function() {
        points.geometry.attributes.position = new THREE.BufferAttribute(
          position,
          3
        )
        points.geometry.attributes.position.needsUpdate = true // required after the first render
      })
      tween.start()
    }
  }

  getZFromScale(scale) {
    let rvFOV = THREE.Math.degToRad(this.camera.fov)
    let scale_height = this.props.height / scale
    let camera_z_position = scale_height / (2 * Math.tan(rvFOV / 2))
    return camera_z_position
  }

  getScaleFromZ(camera_z_position) {
    let rvFOV = THREE.Math.degToRad(this.camera.fov)
    let half_fov_height = Math.tan(rvFOV / 2) * camera_z_position
    let fov_height = half_fov_height * 2
    let scale = this.props.height / fov_height
    return scale
  }

  handleResize = (width, height) => {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    let current_scale = this.getScaleFromZ(this.camera.position.z)
    let d3_x = -(this.camera.position.x * current_scale) + this.props.width / 2
    let d3_y = this.camera.position.y * current_scale + this.props.height / 2
    var resize_transform = d3.zoomIdentity
      .translate(d3_x, d3_y)
      .scale(current_scale)
    let view = d3.select(this.mount)
    this.d3_zoom.transform(view, resize_transform)
  }

  zoomHandler() {
    let d3_transform = d3.event.transform

    let scale = d3_transform.k
    let x = -(d3_transform.x - this.props.width / 2) / scale
    let y = (d3_transform.y - this.props.height / 2) / scale
    let z = this.getZFromScale(scale)

    this.camera.position.set(x, y, z)

    // point size scales at end of zoom
    let new_size = zoomScaler(z)
    let point_group = this.scene.children[0].children
    for (let c = 0; c < point_group.length; c++) {
      point_group[c].material.uniforms.size.value = new_size
    }
  }

  setUpCamera() {
    let { width, height, mnist_embeddings } = this.props

    let aspect = this.camera.aspect
    let vFOV = this.camera.fov
    let rvFOV = THREE.Math.degToRad(vFOV)

    let xs = mnist_embeddings.map(e => e[0])
    let min_x = _.min(xs)
    let max_x = _.max(xs)
    let ys = mnist_embeddings.map(e => e[1])
    let min_y = _.min(ys)
    let max_y = _.max(ys)
    let data_width = max_x - min_x
    let data_height = max_y - min_y
    let data_aspect = data_width / data_height

    let max_x_from_center = _.max([min_x, max_x].map(m => Math.abs(m)))
    let max_y_from_center = _.max([min_y, max_y].map(m => Math.abs(m)))

    let max_center = Math.max(max_x_from_center, max_y_from_center)

    let camera_z_start
    if (data_aspect > aspect) {
      // console.log("width is limiter");
      // camera_z_start = max_x_from_center / Math.tan(rvFOV / 2) / aspect
    } else {
      // console.log("height is limiter");
      // camera_z_start = max_y_from_center / Math.tan(rvFOV / 2)
    }

    camera_z_start = max_center / Math.tan(rvFOV / 2)

    let far = camera_z_start * 1.25
    this.camera.far = far
    this.camera.position.z = camera_z_start * 1.1

    // set up zoom
    this.d3_zoom = d3
      .zoom()
      .scaleExtent([this.getScaleFromZ(far - 1), this.getScaleFromZ(0.1)])
      .on('zoom', this.zoomHandler.bind(this))

    let view = d3.select(this.mount)
    this.view = view
    view.call(this.d3_zoom)
    let initial_scale = this.getScaleFromZ(this.camera.position.z)
    var initial_transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initial_scale)
    this.d3_zoom.transform(view, initial_transform)
  }

  addText() {
  
  
    var bitmap = document.createElement('canvas');
    var g = bitmap.getContext('2d');
    bitmap.width = 2000;
    bitmap.height = 2000;
    g.font = 'Bold 140px Futura';
    let text="ShaderToy Comment Map"
    g.fillStyle = 'white';
    g.fillText(text, 0, 500);
    g.strokeStyle = 'black';
    g.strokeText(text, 0, 20);
    // canvas contents will be used for a texture
    var textureWords = new THREE.Texture(bitmap) 
    textureWords.needsUpdate = true;

    var material = new THREE.MeshBasicMaterial({ map: textureWords, transparent:true,  depthTest: false });
    var geometry = new THREE.PlaneGeometry(8, 8);
    // Create a mesh with the geometry and material
    this.textPlane1 = new THREE.Mesh(geometry, material);
    this.textPlane1.scale.set(4, 4, 4);
    this.textPlane1.position.set( this.textPlane1.position.x, this.textPlane1.position.y+7, 0+this.textPlane1.position.z);
    this.scene.add(this.textPlane1);


    var bitmap2 = document.createElement('canvas');
    var bitmap3 = document.createElement('canvas');
    var bitmap4 = document.createElement('canvas');
    var bitmap5 = document.createElement('canvas');

    var g2 = bitmap2.getContext('2d');
    var g3 = bitmap3.getContext('2d');
    var g4 = bitmap4.getContext('2d');
    var g5 = bitmap5.getContext('2d');

     bitmap2.width = 2000;
     bitmap2.height = 2000;

     bitmap3.width = 2000;
     bitmap3.height = 2000;

     bitmap4.width = 2000;
     bitmap4.height = 2000;

     bitmap5.width = 2000;
     bitmap5.height = 2000;

    g2.font = 'Bold 40px Futura';
    g3.font = 'Bold 34px Futura';
    g4.font = 'Bold 34px Futura';
    g5.font = 'Bold 25px Futura';
    let text2="Comments from the top 1000 shaders clustered by similarity and topic."
    let text3="Hover over a point to see the comment."
    g2.fillStyle = 'white';
    g3.fillStyle = 'white';
    g4.fillStyle = 'white';
    g5.fillStyle = 'white';

    g2.fillText(text2, 300, 350);
    g2.fillText(text3, 300, 400);

    // g2.strokeStyle = 'black';
    // g3.strokeStyle = 'black';
    // g2.strokeText(text2, 0, 20);
    let sc = 5.5/2;
    g3.fillText("Graphics Processing Unit talk", 429.1687469482422*sc, 352* sc);
    g3.fillText("code", 1067, 1207.25);
    g3.fillText("thanking and helping", 750.75 , 726);
    g3.fillText("single word compliments",811.25, 387.75);
    g3.fillText("WebGL",816.75, 1210);
    g3.fillText("Technical Comments",893.75, 1086.25);
    g3.fillText("questions",858, 778.25);

    // g3.fillText("1", 20, 20);
    // g3.fillText("2", 20, 640*sc);

    // g3.fillText("3", 620*sc, 20);
    // g3.fillText("4", 620*sc, 640*sc);

    // g4.fillText("A", 20, 20);
    // g4.fillText("B", 1006.5, 522.5);

    g5.fillText("deleted", 803, 288.75);
    g5.fillText("Connecting off shadertoy", 1016.5, 465.5);
    g5.fillText("technical corrections", 968, 143);
    g5.fillText("shadertoy creator comments", 1108.25, 566.5);
    g5.fillText("asking for commercial use", 940.5, 319);
    // g5.fillText("mind blown", 789.25, 555.5);
    g5.fillText("technical compliments", 1006.5, 387.75);
    g5.fillText("terse compliments", 739.75, 662.75);

    // canvas contents will be used for a texture
    var textureWords2 = new THREE.Texture(bitmap2) 
    textureWords2.needsUpdate = true;

    var textureWords3 = new THREE.Texture(bitmap3) 
    textureWords3.needsUpdate = true;

    var textureWords4 = new THREE.Texture(bitmap4) 
    textureWords4.needsUpdate = true;

    var textureWords5 = new THREE.Texture(bitmap5) 
    textureWords5.needsUpdate = true;

    var material3 = new THREE.MeshBasicMaterial({ map: textureWords3, transparent:true,  depthTest: false });
    var geometry3 = new THREE.PlaneGeometry(8, 8);

    var material2 = new THREE.MeshBasicMaterial({ map: textureWords2, transparent:true,  depthTest: false });
    var geometry2 = new THREE.PlaneGeometry(8, 8);

    var material4 = new THREE.MeshBasicMaterial({ map: textureWords4, transparent:true,  depthTest: false });
    var material5 = new THREE.MeshBasicMaterial({ map: textureWords5, transparent:true,  depthTest: false });


    // Create a mesh with the geometry and material
    this.textPlane2 = new THREE.Mesh(geometry2, material2);
    this.textPlane3 = new THREE.Mesh(geometry3, material3);
    this.textPlane4 = new THREE.Mesh(geometry3, material4);
    this.textPlane5 = new THREE.Mesh(geometry3, material5);

    this.textPlane2.scale.set(5.5, 5.5, 5.5);
    this.textPlane2.position.set( this.textPlane2.position.x, this.textPlane2.position.y-3, 0+this.textPlane2.position.z);

    this.textPlane3.scale.set(5.5, 5.5, 5.5);
    this.textPlane3.position.set( this.textPlane3.position.x, this.textPlane3.position.y-3, 0+this.textPlane3.position.z);

    this.textPlane4.scale.set(5.5, 5.5, 5.5);
    this.textPlane4.position.set( this.textPlane4.position.x, this.textPlane4.position.y-3, 0+this.textPlane4.position.z);

    this.textPlane5.scale.set(5.5, 5.5, 5.5);
    this.textPlane5.position.set( this.textPlane5.position.x, this.textPlane5.position.y-3, 0+this.textPlane5.position.z);

    this.planes = [];

    this.planes[0] = this.textPlane3;
    this.planes[1] = this.textPlane4;
    this.planes[2] = this.textPlane5;

    this.scene.add(this.textPlane2);
    this.scene.add(this.textPlane3);
    this.scene.add(this.textPlane4);
    this.scene.add(this.textPlane5);

    this.textPlane4.visible = false;
    this.textPlane5.visible = false;

console.log("PLANES")
console.log(this.planes)

    gPlane = this.textPlane3;
  }

  addPoints() {
    let { mnist_embeddings, mnist_labels, comments, color_array ,algorithm_choice} = this.props


    let sc = algorithm_choice == 2 ? 2 :1;

    // split embeddings and labels into chunks to match sprites
    let ranges = []
    for (let i = 0; i < sprite_number; i++) {
      let start = i * sprite_size
      let end = (i + 1) * sprite_size
      if (i === sprite_number - 1) end = sprite_number * sprite_size
      ranges.push([start, end])
    }
    let embedding_chunks = ranges.map(range =>
      mnist_embeddings.slice(range[0], range[1])
    )
    let label_chunks = ranges.map(range =>
      mnist_labels.slice(range[0], range[1])
    )

    // load the textures
    let loader = new THREE.TextureLoader()
    this.textures = mnist_tile_locations.map(l => {
      let t = loader.load(l)
      t.flipY = false
      t.magFilter = THREE.NearestFilter
      // t.minFilter = THREE.LinearMipMapLinearFilter;
      return t
    })

    let point_group = new THREE.Group()
    for (let c = 0; c < sprite_number; c++) {
      let echunk = embedding_chunks[c]
      let lchunk = label_chunks[c]

      let vertices = []
      for (let v = 0; v < echunk.length; v++) {
        let embedding = echunk[v]
        let vert = new THREE.Vector3(embedding[0]*sc, embedding[1]*sc, 0)
        vertices[v] = vert
      }

      let geometry = new THREE.BufferGeometry()

      let numVertices = vertices.length
      let positions = new Float32Array(numVertices * 3)
      let offsets = new Float32Array(numVertices * 2)
      let colors = new Float32Array(numVertices * 3)
      geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.addAttribute('offset', new THREE.BufferAttribute(offsets, 2))
      geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3))

      for (let i = 0, index = 0, l = numVertices; i < l; i++, index += 3) {
        let x = echunk[i][0]
        let y = echunk[i][1]
        let z = 0
        positions[index] = x * sc
        positions[index + 1] = y * sc
        positions[index + 2] = z
      }

      // geometry.attributes.position.copyVector3sArray(vertices)

      let texture_subsize = 1 / sprite_side


      for (let index = 0; index< comments.length; index++) {  
      
              // add images for shaders
              let img = new Image();
              //img.style.width = '10%';
              img.src = shaderPrevBase + comments[index][2]
              shader_images[index] = img
              
              
      }

      for (let i = 0, index = 0, l = numVertices; i < l; i++, index += 2) {
        let x = ((i % sprite_side) * sprite_image_size) / sprite_actual_size
        let y =
          (Math.floor(i / sprite_side) * sprite_image_size) / sprite_actual_size
        offsets[index] = x
        offsets[index + 1] = y
      }

      for (let i = 0, index = 0, l = numVertices; i < l; i++, index += 3) {

        let color = color_array[lchunk[i] % color_array.length]
        
        colors[index ] = lchunk[i]*8./ 255
        colors[index + 1] =(i%255) / 255
        colors[index + 2] = color[2] / 255
      }
      

      // uniforms
      let uniforms = {
        texture: { value: this.textures[c] },
        repeat: { value: new THREE.Vector2(texture_subsize, texture_subsize) },
        size: { value: sprite_image_size },
      }

      let vertex_shader = `
        attribute vec2 offset;
        varying vec2 vOffset;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float size;
        void main() {
          vOffset = offset;
          vColor = color;
          gl_PointSize = size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`

      let fragment_shader = `
        uniform sampler2D texture;
        uniform vec2 repeat;
        varying vec2 vOffset;
        varying vec3 vColor;
        void main() {
          vec2 uv = vec2( gl_PointCoord.x, gl_PointCoord.y );
          uv = uv*2.0 - 1.0;
          // vec4 tex = texture2D( texture, uv * repeat + vOffset );
          // if ( tex.r < 0.5 ) discard;
          // tex.r = 1.0;
          // tex.g = 1.0;
          // tex.b = 1.0;
          gl_FragColor = vec4(vColor ,1.0) * vec4(1.50- (length(uv)+0.5 ) ) ;
        }`

      // material
      let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertex_shader,
        fragmentShader: fragment_shader,
        transparent: true,
      })

      // point cloud
      let point_cloud = new THREE.Points(geometry, material)
      point_cloud.userData = { sprite_index: c }

      point_group.add(point_cloud)
    }


    this.scene.add(point_group)
    
  }

  addBlankHighlightPoints() {
    let hover_container = new THREE.Group()
    this.scene.add(hover_container)

    let vert = new THREE.Vector3(0, 0, 0)
    let vertices = [vert]
    let geometry = new THREE.BufferGeometry()
    let numVertices = vertices.length
    var positions = new Float32Array(numVertices * 3) // 3 coordinates per point
    var offsets = new Float32Array(numVertices * 2) // 2 coordinates per point
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.addAttribute('offset', new THREE.BufferAttribute(offsets, 2))

    // all the attributes will be filled on hover
    let texture_subsize = 1 / sprite_side

    // uniforms
    let uniforms = {
      texture: { value: this.textures[0] },
      repeat: { value: new THREE.Vector2(texture_subsize, texture_subsize) },
      size: { value: 56.0 },
    }

    let vertex_shader = `
        attribute vec2 offset;
        varying vec2 vOffset;
        uniform float size;
        void main() {
          vOffset = offset;
          gl_PointSize = size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`

    let fragment_shader = `
        uniform sampler2D texture;
        uniform vec2 repeat;
        varying vec2 vOffset;
        void main() {
          vec2 uv = vec2( gl_PointCoord.x, gl_PointCoord.y );
          uv = uv*2.0 - 1.0;
          // vec4 tex = texture2D( texture, uv * repeat + vOffset );
          // tex.a = tex.r;
          // tex.r = 1.0;
          // tex.g = 1.0;
          // tex.b = 1.0;
          gl_FragColor = vec4(2.0- (length(uv)+1.0));
        }`

    // material
    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertex_shader,
      fragmentShader: fragment_shader,
      transparent: true,
    })

    let point = new THREE.Points(geometry, material)
    point.frustumCulled = false

    this.scene.children[1].visible = false
    this.scene.children[1].add(point)
  }

  highlightPoint(sprite_index, digit_index, full_index) {
    let { algorithm_embedding_keys, algorithm_choice } = this.props

    let point = this.scene.children[1].children[0]

    let embedding = this.props[algorithm_embedding_keys[algorithm_choice]][
      full_index
    ]

    let vert = new THREE.Vector3(embedding[0], embedding[1], 0)
    let vertices = [vert]

    var offsets = new Float32Array(2) // 2 coordinates per point

    let x = ((digit_index % sprite_side) * 28) / 2048
    let y = (Math.floor(digit_index / sprite_side) * 28) / 2048
    offsets[0] = x
    offsets[1] = y

    point.geometry.attributes.position.copyVector3sArray(vertices)
    point.geometry.attributes.position.needsUpdate = true // required after the first render
    point.geometry.attributes.offset.array = offsets
    point.geometry.attributes.offset.needsUpdate = true // required after the first render

    // need to set attributes on geometry and uniforms on material
    point.material.uniforms.texture.value = this.textures[sprite_index]
  }

  removeHighlights() {
    let highlight_container = this.scene.children[1]
    let highlights = highlight_container.children
    highlight_container.remove(...highlights)
  }

  checkIntersects(mouse_position) {
    let { width, height, sidebar_ctx, sidebar_image_size } = this.props

    function mouseToThree([mouseX, mouseY]) {
      return new THREE.Vector3(
        (mouseX / width) * 2 - 1,
        -(mouseY / height) * 2 + 1,
        1
      )
    }

    function sortIntersectsByDistanceToRay(intersects) {
      return _.sortBy(intersects, 'distanceToRay')
    }

    let mouse_vector = mouseToThree(mouse_position)
    this.raycaster.setFromCamera(mouse_vector, this.camera)
    this.raycaster.params.Points.threshold = 1.25
    let intersects = this.raycaster.intersectObjects(
      this.scene.children[0].children
    )
    if (intersects[0]) {
      let sorted_intersects = sortIntersectsByDistanceToRay(intersects)
      let intersect = sorted_intersects[0]
      let sprite_index = intersect.object.userData.sprite_index
      let digit_index = intersect.index
      let full_index = sprite_index * sprite_size + digit_index
      this.props.setHoverIndex(full_index)
      this.highlightPoint(sprite_index, digit_index, full_index)
      this.scene.children[1].visible = true
      


      sidebar_ctx.fillRect(0, 0, sidebar_image_size, sidebar_image_size*0.75)
      // console.log(full_index)
      let shaderImage = shader_images[full_index];
      if (shaderImage && shaderImage.src !== "" && shaderImage.width > 0 && shaderImage.height > 0) {
        sidebar_ctx.drawImage(
        
          shaderImage
          ,
          // source rectangle
          0,
          0,
          235,
          132,
          // destination rectangle
          0,
          0,
          sidebar_image_size,
          sidebar_image_size*0.75
        )
    } else {
        // Add an event listener for the 'error' event
        ///img.addEventListener('error', function() {
            console.log('Image is broken: ' + shaderImage);
        //});
    }
     

    
    } else {
      this.props.setHoverIndex(null)
      this.scene.children[1].visible = false
      sidebar_ctx.fillRect(0, 0, sidebar_image_size, sidebar_image_size*0.75)
    }
  }

  handleMouse() {
    let view = d3.select(this.renderer.domElement)

    this.raycaster = new THREE.Raycaster()

    view.on('mousemove', () => {
      let [mouseX, mouseY] = d3.mouse(view.node())
      let mouse_position = [mouseX, mouseY]
      this.checkIntersects(mouse_position)
    })
    // mouseclick
    view.on('click', () => {
      let [mouseX, mouseY] = d3.mouse(view.node())
      console.log(mouseX *5.5/2, mouseY*5.5/2)
     console.log("CLICK~!")
    })
  }

  init() {
    let { width, height } = this.props

    this.scene = new THREE.Scene()

    let vFOV = 75
    let aspect = width / height
    let near = 0.01
    let far = 1000

    this.camera = new THREE.PerspectiveCamera(vFOV, aspect, near, far)

    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setClearColor(0x111111, 1)
    this.renderer.setSize(width, height)
    this.mount.appendChild(this.renderer.domElement)
    
    this.addPoints()
    
    this.addBlankHighlightPoints()
    this.addText()
    this.setUpCamera()

    this.animate()

    this.handleMouse()
  }

  animate() {
    requestAnimationFrame(this.animate)
    TWEEN.update()
    this.renderer.render(this.scene, this.camera)

  }

  componentDidMount() {
    this.init()
  }

  componentDidUpdate(prevProps) {
    let { width, height, labels } = this.props
    if (width !== prevProps.width || height !== prevProps.height) {
      this.handleResize(width, height)
    }
    if (prevProps.algorithm_choice !== this.props.algorithm_choice) {
      this.changeEmbeddings(
        prevProps.algorithm_choice,
        this.props.algorithm_choice, labels
      )
    }
  }

  componentWillUnmount() {
    this.mount.removeChild(this.renderer.domElement)
  }

  render() {

    let { width, height, labels } = this.props

    // this makes the labels button work
    if(this.scene && this.textPlane3 !=undefined){
      
      if (this.props.algorithm_choice == 0){
        console.log("this.props.algorithm_choic") 
        this.textPlane3.visible = labels;
      }
      if (this.props.algorithm_choice == 1){
        this.textPlane4.visible = labels;
      }
      if (this.props.algorithm_choice == 2){
        this.textPlane5.visible = labels;
      }
      this.textPlane1.visible = !labels;
      this.textPlane2.visible = !labels;

    }
    
    return (
      <div
        style={{ width: width, height: height, overflow: 'hidden' }}
        ref={mount => {
          this.mount = mount
        }}
      />
    )
  }
}

export default Projection
