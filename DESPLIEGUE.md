# Despliegue en AWS EC2

Todo el sistema corre en una sola instancia mediante Docker Compose: SQL Server 2022 Express, el backend FastAPI y Nginx sirviendo el frontend Angular.

```
Internet ─── puerto 80 ──▶ Nginx (frontend Angular)
                             └── /api ──▶ FastAPI ──▶ SQL Server Express
```

Nginx redirige `/api` al backend, así que el frontend y la API comparten dominio y no hace falta configurar CORS ni fijar la IP en el código.

---

## Antes de empezar: el costo

Las cuentas de AWS creadas después del 15 de julio de 2025 usan el modelo de créditos: se reciben $100 (ampliables a $200) y el consumo se descuenta de ese saldo durante 6 meses. **Mientras haya crédito, la factura es cero**, pero cada hora encendida gasta saldo.

| Recurso | Consumo aproximado |
|---|---|
| t3.small (2 GB de RAM) | $0.021 por hora |
| IPv4 pública | $0.005 por hora |
| Disco EBS 20 GB | ~$1.60 al mes |

Encender la instancia solo para trabajar y presentar (unas 15 horas) gasta cerca de **$0.40 de crédito**.

Se necesita t3.small porque **SQL Server en Linux exige 2 GB de RAM como mínimo**; una t2.micro o t3.micro tiene 1 GB y el motor no arranca.

**Antes que nada, elimina la instancia del otro proyecto** siguiendo la sección final de esta guía. Dos instancias encendidas consumen el doble.

---

## 1. Crear la instancia

1. Consola de AWS → EC2 → **Launch instance**.
2. Nombre: `sistema-horarios`.
3. AMI: **Ubuntu Server 24.04 LTS**.
4. Tipo: **t3.small**.
5. Par de claves: crear uno nuevo (`horarios.pem`) y guardarlo bien. Sin él no se puede entrar.
6. Almacenamiento: **20 GB** gp3.
7. Grupo de seguridad, con estas reglas de entrada:

   | Tipo | Puerto | Origen |
   |---|---|---|
   | SSH | 22 | Mi IP |
   | HTTP | 80 | 0.0.0.0/0 |

   El puerto 1433 de SQL Server **no se abre**: la base solo se usa desde dentro de la instancia.

8. Lanzar y copiar la **IP pública IPv4**.

---

## 2. Conectarse

Desde PowerShell, en la carpeta donde está la clave:

```powershell
icacls.exe horarios.pem /reset
icacls.exe horarios.pem /grant:r "$($env:USERNAME):(R)"
icacls.exe horarios.pem /inheritance:r
ssh -i horarios.pem ubuntu@LA_IP_PUBLICA
```

---

## 3. Instalar Docker

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu
newgrp docker
```

Comprobar:

```bash
docker --version
docker compose version
```

---

## 4. Descargar el proyecto y configurar la contraseña

```bash
git clone https://github.com/mmontoyae/sistema-horarios.git
cd sistema-horarios
cp .env.ejemplo .env
nano .env
```

Cambiar `CLAVE_SA` por una contraseña propia. SQL Server exige al menos 8 caracteres con mayúsculas, minúsculas, números y algún símbolo. Guardar con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 5. Levantar el sistema

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos: descarga la imagen de SQL Server (~1.5 GB) y compila el frontend.

Seguir el progreso de la creación de la base:

```bash
docker compose logs -f inicializar_bd
```

Debe terminar con `Base de datos lista`. Después:

```bash
docker compose ps
```

Los contenedores `horarios_bd`, `horarios_api` y `horarios_web` deben aparecer como *running*; `horarios_init` aparece como *exited (0)*, que es lo correcto porque ya terminó su trabajo.

Abrir en el navegador: `http://LA_IP_PUBLICA`

---

## 6. Comprobar que funciona

1. La pantalla de inicio debe cargar con el fondo 3D.
2. En **Importar**, arrastrar `datos/insumos_horarios.xlsx` y enviarlo. Cada hoja responde con su resumen.
3. Registrar una propuesta válida marcando *confirmar*.
4. Revisar la matriz semanal y la lista de conflictos.

La API queda documentada en `http://LA_IP_PUBLICA/api/docs`.

---

## Comandos útiles

```bash
docker compose logs -f api          # ver los registros del backend
docker compose restart api          # reiniciar solo el backend
docker compose down                 # detener todo (conserva los datos)
docker compose up -d                # volver a levantar
git pull && docker compose up -d --build   # aplicar cambios del repositorio
```

Para recrear la base desde cero (borra todos los datos):

```bash
docker compose run --rm -e FORZAR_RECREACION=1 inicializar_bd
```

### Apagar sin borrar

Entre sesiones de trabajo conviene **detener** la instancia desde la consola de EC2 (*Instance state → Stop*). Deja de consumir crédito por cómputo y por IP; solo sigue contando el disco. Al encenderla otra vez la IP pública cambia, salvo que se asigne una Elastic IP.

---

## 7. Eliminar todo al terminar

Este es el paso que evita cualquier cobro. Hay que borrar **cinco** cosas, no solo la instancia:

1. **Terminar la instancia**
   EC2 → Instances → seleccionar → *Instance state* → **Terminate instance**.

2. **Verificar el volumen EBS**
   EC2 → Elastic Block Store → **Volumes**. Si quedó alguno en estado *available*, seleccionarlo y **Delete volume**. Normalmente se borra junto con la instancia, pero conviene revisarlo.

3. **Liberar la Elastic IP** (si creaste una)
   EC2 → Network & Security → **Elastic IPs** → seleccionar → *Actions* → **Release Elastic IP addresses**.
   Una IP reservada y sin usar sí genera cobro.

4. **Borrar snapshots y AMIs**
   EC2 → Elastic Block Store → **Snapshots**, y EC2 → Images → **AMIs**. Eliminar los que hayas creado.

5. **Confirmar en la facturación**
   Billing and Cost Management → **Bills**. Al día siguiente el consumo debe quedar detenido.

Conviene además crear una alerta: Billing → **Budgets** → presupuesto de $1 con aviso por correo. Así te enteras si algo quedó encendido.

### Comprobación rápida por región

Los recursos son por región. Si trabajaste en más de una, revisa cada una. En la consola, el selector de región está arriba a la derecha.

---

## Alternativa sin servidor: demo en GitHub Pages

El repositorio incluye un flujo de trabajo que publica el frontend en GitHub Pages en modo demostración, sin backend: la validación se ejecuta en el navegador con las mismas reglas.

Para activarlo: en GitHub → Settings → Pages → *Source*: **GitHub Actions**. Cada envío a `main` publica en `https://mmontoyae.github.io/sistema-horarios/`.

Sirve como respaldo si el día de la presentación falla la conexión o la instancia, aunque no reemplaza al sistema completo: no usa FastAPI ni el procedimiento almacenado de SQL Server.
