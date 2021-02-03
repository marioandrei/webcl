__kernel void clDesaturate(__global const uchar4* src,
                           __global uchar4* dst,
                           uint width, 
                           uint height) {
    int x = get_global_id(0); /* id de la pos en la imagen */
    int y = get_global_id(1); /* id de la pos en la imagen */
    if (x >= width || y >= height) return; /* comprobar que estamso dentro de los limites*/

    /* convertimos una mini matriz en un array, por eso solo tenemos un  indice */
    int i = y * width + x;

    /*  Este es el algoritmo para desaturar , declara un color como un utf char 4 creo que es 4 bytes que son 32 bits

    el indice es =  y*ancho + x
    x,y,width= 3,3,6 para cada pixel  
    ......
    ......
    ..x... 

    lum es un valor calculado a traves del RGB de cada pixel
    multimplicamos la componente X, que es el R por 0.3
                                Y  que es el G por 0.59
                                Z que es el B por 0.11

    estos valores por los cuales multimplicamos son los valores  
    que aplicacmos a la imagen, a mayor R pues mas infraroja la imagen, 
    segun los valores, podemos filtrar algun color de la imagen

    */
    uchar4 color = src[i];
    uchar lum = (uchar)(0.30f * color.x + 0.59f * color.y + 0.11f * color.z);
    /* el final, guardamos en el destino el mismo valor para todos los colores RGB, es decir , acabamos con una matriz para cada color, el ultimo numero es la transparencia, pero esto es como se define un RGBA en html5/css3 */
    dst[i] = (uchar4)(lum, lum, lum, 255);
}