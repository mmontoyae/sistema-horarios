# Comportamiento del sistema con grandes volúmenes de datos

Documento de respuesta a la pregunta: *¿qué ocurre si se sube mucha información? ¿Se bloquea, se cae, colapsa?*

La respuesta corta es que **el sistema no colapsa de golpe: se degrada por etapas y falla en puntos concretos**, cada uno con un síntoma distinto. A continuación se identifica cada límite, el volumen aproximado en que aparece y la solución aplicada.

---

## 1. Rechazo del envío por tamaño (el primero en aparecer)

**Qué pasaba.** Nginx rechaza por defecto cualquier petición cuyo cuerpo supere **1 MB**, devolviendo un error `413 Request Entity Too Large`. Como cada registro ocupa unos 200 bytes en JSON, el límite se alcanzaba alrededor de **5 000 filas**, un volumen perfectamente normal para una facultad completa.

**Síntoma.** La carga fallaba de inmediato con un error del servidor, sin llegar siquiera al backend.

**Solución.** Se amplió el límite a 32 MB y se subieron los tiempos de espera del proxy, ya que una carga grande tarda más que una petición corriente.

```nginx
client_max_body_size 32m;
proxy_read_timeout 300s;
```

---

## 2. Bloqueo del navegador al dibujar la vista previa

**Qué pasaba.** La vista previa mostraba **todas** las filas del archivo, y cada fila genera un campo editable por columna. Con 5 000 filas de distributivo (7 columnas) el navegador tenía que crear más de **35 000 elementos** en pantalla. La pestaña se congelaba varios segundos o dejaba de responder.

**Síntoma.** El navegador se traba tras leer el archivo, antes de enviar nada.

**Solución.** La vista previa dibuja **50 filas** y ofrece un botón para ir mostrando más. Los datos completos siguen en memoria y se envían enteros; solo se limita lo que se pinta.

---

## 3. Inserción fila por fila en la base de datos

**Qué pasaba.** El backend consultaba la base **una vez por cada fila** para saber si el registro ya existía, y luego la insertaba individualmente. Es el problema clásico llamado *N+1*: con 5 000 filas se hacían 5 000 viajes de ida y vuelta a SQL Server.

**Síntoma.** La importación tardaba minutos y mantenía la conexión ocupada; con archivos mayores, la petición expiraba.

**Solución.** Ahora la operación se resuelve con **tres consultas en total**, sin importar cuántas filas lleguen: una para averiguar qué identificadores ya existen, una inserción masiva y una actualización masiva.

```python
existentes = db.scalars(select(columna).where(columna.in_(lote))).all()
db.bulk_insert_mappings(modelo, nuevos)
db.bulk_update_mappings(modelo, modificados)
```

Además se detectan los identificadores repetidos dentro del propio archivo y se avisa de ellos en el resumen.

---

## 4. Envío en un solo bloque

**Qué pasaba.** Todo el contenido de una hoja se mandaba en una única petición. Si fallaba a la mitad, no había forma de saber cuánto se había guardado.

**Solución.** El frontend trocea el envío en **lotes de 500 registros**, muestra una barra de progreso y acumula el resultado. Si el archivo supera los 1 000 registros aparece además un aviso explicando que el proceso será más lento.

---

## 5. Consultas sin índices

**Qué pasaba.** Las funciones de validación filtran repetidamente por docente, espacio y día. Sin índices, SQL Server recorría la tabla completa en cada comprobación, de modo que el tiempo crecía linealmente con el número de bloques ya registrados.

**Solución.** Se añadieron índices compuestos sobre las columnas que usan las validaciones:

```sql
CREATE INDEX ix_horario_docente_dia ON dbo.horario (docente_id, dia_semana)
    INCLUDE (hora_inicio, hora_fin);
CREATE INDEX ix_horario_espacio_dia ON dbo.horario (espacio_id, dia_semana)
    INCLUDE (hora_inicio, hora_fin);
```

---

## 6. Crecimiento indefinido del registro de conflictos

**Qué pasaba.** El historial de conflictos era una lista en memoria que solo crecía. En una sesión larga con miles de validaciones, el proceso iba consumiendo memoria hasta afectar al servidor.

**Solución.** Se sustituyó por una cola con tope de 500 entradas: al llenarse, descarta automáticamente las más antiguas. La memoria queda acotada.

```python
historial_conflictos: deque = deque(maxlen=500)
```

---

## Límites que siguen existiendo

Conviene conocerlos y son propios de la infraestructura elegida, no defectos del código:

| Límite | Valor | Consecuencia |
|---|---|---|
| SQL Server **Express** | 10 GB por base de datos | Suficiente para millones de filas de horario |
| SQL Server **Express** | 1 GB de RAM utilizable | Con tablas muy grandes hay más lectura de disco |
| Instancia **t3.small** | 2 GB de RAM en total | Compartidos entre base de datos, backend y servidor web |
| Instancia **t3** | CPU por créditos | Un uso intensivo sostenido reduce el rendimiento al 20 % |
| Lectura del Excel | memoria del navegador | Un archivo de más de ~50 MB puede agotar la pestaña |

**Si el sistema tuviera que crecer de verdad**, el orden razonable sería: pasar a SQL Server Standard o a Amazon RDS, subir el tipo de instancia (t3.medium o superior), separar la base de datos en su propio servidor, y procesar las importaciones en segundo plano con una cola de trabajos en lugar de hacerlo dentro de la petición HTTP.

---

## Resumen para la exposición

> El sistema no se cae de golpe. Falla primero en el punto más frágil, que resultó ser el límite de tamaño de petición del servidor web —solo 1 MB por defecto—, y después en el navegador al dibujar la vista previa. Identificamos cinco cuellos de botella y los corregimos: ampliamos el límite del servidor, limitamos las filas que se dibujan, sustituimos la inserción fila por fila por operaciones masivas, troceamos el envío en lotes con barra de progreso, añadimos índices a la base de datos y acotamos el registro de conflictos en memoria.
