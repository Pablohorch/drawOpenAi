# drawOpenAi Whiteboard

Aplicaci\u00f3n de pizarra infinita desarrollada en HTML, CSS y TypeScript.

La interfaz se ha redise\u00f1ado para adaptarse tanto a ordenadores como a tel\u00e9fonos m\u00f3viles. Los men\u00fas y herramientas cambian de posici\u00f3n en pantallas peque\u00f1as para mantener la usabilidad.

## Uso local

Ejecuta `tsc` para generar `script.js` y abre `index.html` en un navegador moderno. El dibujo se guarda autom\u00e1ticamente en `localStorage` y se restaura al recargar.

## Dise\u00f1o adaptativo

En equipos de escritorio la barra de herramientas se muestra en vertical y los controles de acci\u00f3n permanecen en la esquina superior. En dispositivos m\u00f3viles la barra pasa a disponerse horizontalmente en la parte inferior y los botones se agrandan para facilitar su manejo t\u00e1ctil.

### Controles

- **Pincel**: traza l\u00edneas libres.
- **Rect\u00e1ngulo** y **L\u00ednea**: haz clic y arrastra.
- **Seleccionar**: pulsa sobre cualquier forma para moverla o ajustar sus v\u00e9rtices. Si haces clic en una zona vac\u00eda podr\u00e1s desplazar el tablero.
- **Texto**: crea un cuadro de texto para escribir. El contenido se edita directamente dentro del cuadro. Al activar esta herramienta se muestra un menú de colores a la izquierda para cambiar el tono del texto. Haz doble clic para modificar un texto existente.

- **Pan**: mant\u00e9n pulsada la barra espaciadora o usa el bot\u00f3n derecho del rat\u00f3n y arrastra. Tambi\u00e9n puedes arrastrar en vac\u00edo con la herramienta de selecci\u00f3n.
- **Zoom**: rueda del rat\u00f3n o gesto de pellizco.

## Despliegue en GitHub Pages

Tras fusionar a `main`, copia todos los archivos al branch `gh-pages` y publica desde la configuraci\u00f3n de GitHub Pages. Si modificas los archivos est\u00e1ticos recuerda incrementar la constante `CACHE` en `sw.js` para que los navegadores descarguen la nueva versi\u00f3n.

Para verificar que la página desplegada corresponde a la última compilación, incrementa también el número de versión que aparece en el elemento `<title>` de `index.html`. Así, al cargar la web se puede comprobar fácilmente que se está viendo la versión correcta.
