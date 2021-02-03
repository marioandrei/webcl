function changeImage(img) {
  document.getElementById("srcimg").src = img;
  document.getElementById("srcimgSerie").src = img;
}
    

    /* esta funcion es para para poder pintar en el canvas dentro del documento html 
    define: 
    + canvasImg que es el ID del canvas en el html
    + canvasImgCtx que parece ser que es el tipo, contexto, en este caso 2d 
    + srcImg es la imagen con ID srcimg
    adquiere el valor de las dimensiones de la imagen y los guarda en canvasImg
    Dibuja en canvasImgCtc.drawImage (la imagen, la posicion x y, el ancho y el alto) 

    canvas no es soportado en IExplorer 9.
    */
  function setupCanvas(idCanvas,context,idImgSrc,idOutput) {
    try {
      var canvasImg = document.getElementById(idCanvas);
      var canvasImgCtx = canvasImg.getContext(context);
      var srcImg = document.getElementById(idImgSrc);
      canvasImg.width = srcImg.width;
      canvasImg.height = srcImg.height;
      canvasImgCtx.drawImage (srcImg, 0, 0, srcImg.width, srcImg.height);
    } catch(e) {
      document.getElementById(idOutput).innerHTML += "<h3>ERROR:</h3><pre style=\"color:red;\">" + e.message + "</pre>";
      throw e;
    }
  }
  /* la funcion de cargar kernel.*/
  function loadKernel(id){
    var kernelElement = document.getElementById(id);
    var kernelSource = kernelElement.text;
    /* si esta en blanco el codigo fuente, crea nuevo
      XMLHTTPRequest
      luego abre la peticion, hace un GET 
      y lo envia
      luego guarda en kernelSource la respuesta!*/
    if (kernelElement.src != "") {
      var mHttpReq = new XMLHttpRequest();
      mHttpReq.open("GET", kernelElement.src, false);
      mHttpReq.send(null);
      kernelSource = mHttpReq.responseText;
    } 
    return kernelSource;
  }

  function CL_desaturate () {

    /* toda las salidas van al elemento con id "output"*/
    var output = document.getElementById("output");
    output.innerHTML = "";

    try {

      // primero comprobamos que la extension WEBCL
      // esta instalada 
      if (window.WebCL == undefined) {
        alert("Desafortunadamente su sistema no suporta WebCL. " +
          "Asegurese de que tiene instalado el driver OpenCL " +
          "y la extension WebCL instalada en su navegador.");
        return false;
      }

      // obtener del elemento canvas la informacion de los pixels
      var canvasImg = document.getElementById("canvasImg");
      var canvasImgCtx = canvasImg.getContext("2d");
      var width = canvasImg.width;
      var height = canvasImg.height;
      var pixels = canvasImgCtx.getImageData(0, 0, width, height);


      //en caso de error, subrayar el canvas
      canvasImgCtx.fillStyle = "rgba(0,0,0,0.7)";
      canvasImgCtx.fillRect(0, 0, width, height);
      
      // configurar contexto WebCL 
      //contexto son los dispositivos que usaremos
      // usamos la primera plataforma disponible
      var platforms = WebCL.getPlatformIDs(); 
      // output.innerHTML += platforms;
      
      var ctx = WebCL.createContextFromType ([WebCL.CL_CONTEXT_PLATFORM, platforms[0]],
        WebCL.CL_DEVICE_TYPE_DEFAULT);

      // configurar buffers
      var imgSize = width * height;
      output.innerHTML += "<br>Tamano de la imagen: " + imgSize + " pixels ("
       + width + " x " + height + ")";
      var bufSize = imgSize * 4; // size in bytes
      output.innerHTML += "<br>Tamano del Buffer: " + bufSize + " bytes";
      
      var bufIn = ctx.createBuffer (WebCL.CL_MEM_READ_ONLY, bufSize);
      var bufOut = ctx.createBuffer (WebCL.CL_MEM_WRITE_ONLY, bufSize);

      /* calcular el tiempo de inicio del algoritmo */
      var start = (new Date).getTime();

       // crear y construi el programa ( build )
       var kernelSrc = loadKernel("clProgramDesaturate");
       var program = ctx.createProgramWithSource(kernelSrc);
       var devices = ctx.getContextInfo(WebCL.CL_CONTEXT_DEVICES);
       try {
        program.buildProgram ([devices[0]], "");
      } catch(e) {
        alert ("error al hacer el build del programa WebCL. Error "
         + program.getProgramBuildInfo (devices[0], WebCL.CL_PROGRAM_BUILD_STATUS)
         + ":  " + program.getProgramBuildInfo (devices[0], WebCL.CL_PROGRAM_BUILD_LOG));
        throw e;
      }

      // Crear kernel y poner los argumentos
      // los buffers de entrada y salida, asi como el tamamo
      // de la imagen que se envia (el tamano del buffer)
      var kernel = program.createKernel ("clDesaturate");
      kernel.setKernelArg (0, bufIn);
      kernel.setKernelArg (1, bufOut);
      kernel.setKernelArg (2, width, WebCL.types.UINT);
      kernel.setKernelArg (3, height, WebCL.types.UINT);

      // Creare una cola (command queue)
      // usando el primer dispositivo disponible
      var cmdQueue = ctx.createCommandQueue (devices[0], 0);

      // escribir el buffer en la memoria compartida del dispostivo OpenCL
      cmdQueue.enqueueWriteBuffer (bufIn, false, 0, bufSize, pixels.data, []);

      // Inicializar el  ND-range 
      var localWS = [16,4];  
      var globalWS = [Math.ceil (width / localWS[0]) * localWS[0], 
      Math.ceil (height / localWS[1]) * localWS[1]];
      
      output.innerHTML += "<br>dimensiones del work group: " + globalWS.length;
      for (var i = 0; i < globalWS.length; ++i)
        output.innerHTML += "<br>tamano de cada item de trabajo global[" + i + "]: " + globalWS[i];
      for (var i = 0; i < localWS.length; ++i)
        output.innerHTML += "<br>tamano de cada item de trabajo local[" + i + "]: " + localWS[i];
      
      // Ejecutar (enqueue) kernel
      cmdQueue.enqueueNDRangeKernel(kernel, globalWS.length, [], globalWS, localWS, []);

      // leer el resultado del buffer en en memoria del dispositivo OpenCL
      cmdQueue.enqueueReadBuffer (bufOut, false, 0, bufSize, pixels.data, []);
      cmdQueue.finish (); //finalizar las operaciones, limpiar todo
      

      // esto es volver a poner los datos del buffer en el canvas html5
      canvasImgCtx.putImageData (pixels, 0, 0);


      /*imprimir el tiempo tardado en calcular */

      /* tener en cuenta:
      http://ejohn.org/blog/accuracy-of-javascript-time/
      que si el calculo es menor de 15ms, lo redondea a 0!
      */

      var diff = (new Date).getTime() - start;

      output.innerHTML += "<br>Tiempo de Calculo: " + diff + "ms";


      /* Salida */
      output.innerHTML += "<br>Ejecucion Finalizada.";
    } catch(e) {
      document.getElementById("output").innerHTML += "<h3>ERROR:</h3><pre style=\"color:red;\">" + e.message + "</pre>";
      throw e;
    }
  }

  function desaturate_serie() {
    var output = document.getElementById("outputSerie");
    output.innerHTML = "";
    

    //output.innerHTML += "<br>HELLO.";

    /* calcular el tiempo de inicio del algoritmo */
    var start = (new Date).getTime();

    var imgObj = document.getElementById('srcimgSerie')
    var canvas = document.createElement('canvas');
    var canvasContext = canvas.getContext('2d');

    var imgW = imgObj.width;
    var imgH = imgObj.height;
    canvas.width = imgW;
    canvas.height = imgH;

    canvasContext.drawImage(imgObj, 0, 0);
    var imgPixels = canvasContext.getImageData(0, 0, imgW, imgH);

    for(var y = 0; y < imgPixels.height; y++){
    for(var x = 0; x < imgPixels.width; x++){
      var i = (y * 4) * imgPixels.width + x * 4;
      /*var avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3;*/
      var avg = (imgPixels.data[i]*0.30 + imgPixels.data[i + 1]*0.59 + imgPixels.data[i + 2]*0.11);
      imgPixels.data[i] = avg; 
      imgPixels.data[i + 1] = avg; 
      imgPixels.data[i + 2] = avg;
    }
    }
    canvasContext.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
    imgObj.src = canvas.toDataURL();
    var diff = (new Date).getTime() - start;
    output.innerHTML += "<br>Tiempo de Calculo: " + diff + "ms";
    output.innerHTML += "<br>Ejecucion Finalizada.";
  }