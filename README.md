# drawOpenAi Whiteboard

Aplicaci\u00f3n de pizarra infinita desarrollada en HTML, CSS y TypeScript.

## Uso local

Ejecuta `tsc` para generar `script.js` y abre `index.html` en un navegador moderno. El dibujo se guarda autom\u00e1ticamente en `localStorage` y se restaura al recargar.

### Controles

- **Pincel**: traza l\u00edneas libres.
- **Rect\u00e1ngulo** y **L\u00ednea**: haz clic y arrastra.
- **Seleccionar**: pulsa sobre cualquier forma para moverla o ajustar sus v\u00e9rtices. Si haces clic en una zona vac\u00eda podr\u00e1s desplazar el tablero.
- **Texto**: crea un cuadro de texto para escribir.
- **Pan**: mant\u00e9n pulsada la barra espaciadora o usa el bot\u00f3n derecho del rat\u00f3n y arrastra. Tambi\u00e9n puedes arrastrar en vac\u00edo con la herramienta de selecci\u00f3n.
- **Zoom**: rueda del rat\u00f3n o gesto de pellizco.

## Despliegue en GitHub Pages

Tras fusionar a `main`, copia todos los archivos al branch `gh-pages` y publica desde la configuraci\u00f3n de GitHub Pages. Si modificas los archivos est\u00e1ticos recuerda incrementar la constante `CACHE` en `sw.js` para que los navegadores descarguen la nueva versi\u00f3n.
