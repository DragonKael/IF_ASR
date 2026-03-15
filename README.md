# PROYECTO DE INVESTIGACIÓN FORMATIVA: IMPLEMENTACIÓN DE PROTOCOLOS TCP Y UDP

Este proyecto implementa los protocolos de transporte **TCP (Multihilo)** y **UDP** utilizando **Node.js** para demostrar la comunicación multicliente en un entorno de red heterogéneo. Desarrollado para la asignatura de Arquitectura de Sistemas de Redes en la **Universidad Andina del Cusco (UAC)**.

## 🎯 Objetivo del Proyecto
Implementar los protocolos TCP y UDP en Node.js, demostrando el funcionamiento multihilo con un servidor Fedora y cinco clientes en diversos sistemas operativos, realizando procesamiento de datos y comunicación en tiempo real.

---

## 🌐 Configuración de Red (Clase B)
De acuerdo a los requerimientos técnicos, todas las máquinas deben pertenecer a la red **172.16.0.0/16**.

| Rol | Integrante | Sistema Operativo | Interfaz Puente | IP Estática VM | IP Host |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Servidor** | **Luis** | **FedoraServer (43)** | `enp0s8` | `172.16.0.11` | `172.16.0.10` |
| Cliente 1 | Yhojan | Windows 11 | `Ethernet` | `172.16.0.2` | --- |
| Cliente 2 | Fredy | Linux Mint | `enp0s8` | `172.16.0.3` | `172.16.0.20` |
| Cliente 3 | Jadee | Ubuntu | `enp0s8` | `172.16.0.4` | `172.16.0.30` |
| Cliente 4 | Ulises | ArchLinux | `enp0s8` | `172.16.0.5` | `172.16.0.40` |
| Cliente 5 | Luciana | CentOS | `enp0s8` | `172.16.0.6` | `172.16.0.50` |

**Puerta de Enlace (Gateway):** `172.16.0.1`

---

## 🛠️ Comandos de Instalación y Configuración

### 1. Fedora Server 43 & CentOS (Luis & Luciana)
```bash
# Instalación de requisitos
sudo dnf install nodejs npm wireshark -y

# Configuración de IP Estática en interfaz enp0s8
sudo nmcli connection modify 'Wired connection 1' \
ipv4.addresses 172.16.0.X/16 \
ipv4.gateway 172.16.0.1 \
ipv4.method manual \
connection.interface-name enp0s8
sudo nmcli connection up 'Wired connection 1'

# Firewall: Apertura de puertos [TCP: 3000, UDP: 3001]
sudo firewall-cmd --add-port=3000/tcp --add-port=3001/udp --permanent
sudo firewall-cmd --reload
```

### 2. Windows 11 (Yhojan)
```powershell
# Instalación de Node.js (vía winget)
winget install OpenJS.NodeJS

# Configuración de IP (PowerShell como Administrador)
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 172.16.0.2 -PrefixLength 16 -DefaultGateway 172.16.0.1

# Reglas de Firewall
New-NetFirewallRule -DisplayName "ASR_TCP" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ASR_UDP" -Direction Inbound -LocalPort 3001 -Protocol UDP -Action Allow
```

### 3. Ubuntu & Linux Mint (Jadee & Fredy)
```bash
# Instalación de requisitos
sudo apt update && sudo apt install nodejs npm wireshark -y

# Configuración de IP en enp0s8
sudo nmcli connection modify 'Wired connection 1' \
ipv4.addresses 172.16.0.X/16 \
ipv4.gateway 172.16.0.1 \
ipv4.method manual \
connection.interface-name enp0s8
sudo nmcli connection up 'Wired connection 1'

# Firewall (Si usa firewall-cmd o ufw)
sudo ufw allow 3000/tcp
sudo ufw allow 3001/udp
```

### 4. ArchLinux (Ulises)
```bash
# Instalación de requisitos
sudo pacman -S nodejs npm wireshark-qt

# Configuración de IP en enp0s8
sudo nmcli connection modify 'enp0s8' \
ipv4.addresses 172.16.0.5/16 \
ipv4.gateway 172.16.0.1 \
ipv4.method manual
sudo nmcli connection up 'enp0s8'
```

---

## 🚀 Despliegue y Ejecución

### 1. Clonar Repositorio y Preparar
```bash
git clone https://github.com/dragonkael/IF_ASR.git
cd IF_ASR
npm install
```
#### 1.1 Actualizar y Preparar(en caso de cambios en el codigo)
```bash
cd IF_ASR
git pull origin main
npm install
```

### 2. Ejecución
* **Servidor (Fedora):** `npm run server`
* **Clientes:** `npm run client`

---
### 1. Tramas capturadas mediante WireShark y Filtros de Red

[cite_start]Para garantizar la correcta evaluación del tráfico entre el servidor (Fedora) y los clientes (Windows, Mint, Ubuntu, ArchLinux) [cite: 102][cite_start], se implementaron filtros de captura y visualización orientados a la red Clase B (`172.16.0.0/16`).

**Topología de Referencia:**
* **Servidor Fedora (Node.js):** `172.16.0.10` (Puertos: `3000` TCP / `3001` UDP)
* **Cliente 1 (Windows - Yhojan):** `172.16.0.20`
* **Cliente 2 (Mint - Fredy):** `172.16.0.30`
* **Cliente 3 (Ubuntu - Jadee):** `172.16.0.40`
* **Cliente 4 (ArchLinux - Ulises):** `172.16.0.50`

#### 1. Filtros en el Servidor (Fedora - Terminal Only)
[cite_start]Dado que el servidor anfitrión opera sin interfaz gráfica, se utilizó `tshark` para la captura de paquetes[cite: 117]. 

* **Capturar todo el tráfico TCP y UDP de la aplicación Node.js:**
    `tshark -i <interfaz_red> -f "net 172.16.0.0/16 and (tcp port 3000 or udp port 3001)" -w capturas_servidor.pcap`
    *(Este comando guarda las tramas en un archivo `.pcap` para su posterior análisis gráfico).*

* **Monitoreo en tiempo real (solo tráfico de los clientes asignados):**
    `tshark -i <interfaz_red> -Y "ip.src == 172.16.0.20 or ip.src == 172.16.0.30 or ip.src == 172.16.0.40 or ip.src == 172.16.0.50"`

#### 2. Filtros de Visualización en Clientes (Wireshark GUI)
Cada cliente debe aplicar los siguientes filtros en la barra de búsqueda de Wireshark para aislar su interacción específica con el servidor, ignorando el ruido de fondo de la red. 

* **Filtro para Yhojan (Windows):**
    `ip.addr == 172.16.0.2 and ip.addr == 172.16.0.11 and (tcp.port == 3000 or udp.port == 3001)`

* **Filtro para Fredy (Linux Mint):**
    `ip.addr == 172.16.0.20 and ip.addr == 172.16.0.11 and (tcp.port == 3000 or udp.port == 3001)`

* **Filtro para Jadee (Ubuntu):**
    `ip.addr == 172.16.0.10 and ip.addr == 172.16.0.40 and (tcp.port == 3000 or udp.port == 3001)`

* **Filtro para Ulises (ArchLinux):**
    `ip.addr == 172.16.0.10 and ip.addr == 172.16.0.50 and (tcp.port == 3000 or udp.port == 3001)`

#### 3. Filtros Específicos por Protocolo (Para Pruebas del Menú en Consola)
[cite_start]Para validar requerimientos específicos de la interacción continua del menú[cite: 110, 111], se utilizaron los siguientes filtros:

* **Solo ver el establecimiento de conexión (Handshake TCP de 3 vías):**
    `tcp.flags.syn == 1 and tcp.flags.ack == 0 and ip.addr == 172.16.0.10`
* **Monitorear exclusivamente el tráfico UDP (ej. para pruebas de latencia o mensajería rápida del chat):**
    `udp.port == 3001 and ip.addr == 172.16.0.10`

## 📋 Requerimientos de la Evaluación
1.  **Interacción Continua:** Menú en consola con operaciones consecutivas.
2.  **Algoritmos:** Ordenamiento de 10 números y multiplicación de matrices $N 	imes N$.
3.  **Chat:** Comunicación interactiva entre múltiples clientes y servidor.
4.  **Wireshark:** Captura y análisis de tramas desde el anfitrión.
5.  **Formato:** Informe en Arial 12, Courier New 11 para código y normas APA.

---
**Desarrollado por:** dragonkael (Luis Salas)
