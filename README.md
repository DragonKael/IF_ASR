# PROYECTO DE INVESTIGACIÓN FORMATIVA: IMPLEMENTACIÓN DE PROTOCOLOS TCP Y UDP

Este proyecto implementa los protocolos de transporte TCP y UDP utilizando **Node.js** para demostrar la comunicación multicliente en un entorno de red real. Se desarrolla para la asignatura de Arquitectura de Sistemas de Redes en la **Universidad Andina del Cusco (UAC)**.

## 🎯 Objetivo del Proyecto
Implementar un servidor multihilo/multicliente en Linux Fedora que gestione interacciones simultáneas con 4 clientes (Windows, Mint, Ubuntu, ArchLinux), realizando operaciones de ordenamiento, matrices y chat en tiempo real.

---

## 🌐 Configuración de Red (Clase B)
De acuerdo a los requerimientos, todas las máquinas deben pertenecer a la red **172.16.0.0
Puerta de enlace 172.16.0.1**.

| Rol | Integrante | Sistema Operativo | IP Estática |
| :--- | :--- | :--- | :--- |
| **Servidor** | **Dragonkael** | **Fedora KDE (43)** | `172.16.0.11` |
| Cliente 1 | Yhojan | Windows | `172.16.0.2` |
| Cliente 2 | Fredy | Linux Mint | `172.16.0.3` |
| Cliente 3 | Jadee | Ubuntu | `172.16.0.4` |
| Cliente 4 | Ulises | ArchLinux | `172.16.0.5` |

### Comandos de Red Express:
* **Linux:** `sudo nmcli connection modify 'Wired connection 1' ipv4.addresses 172.16.0.X/16 ipv4.method manual && sudo nmcli connection up 'Wired connection 1'`
* **Windows (PowerShell Admin):** `New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 172.16.0.2 -PrefixLength 16`

---

## 🚀 Instalación y Despliegue

### 1. Requisitos Previos
* Tener instalado **Node.js** y **npm**.
* Tener **Wireshark** instalado para la captura de tramas.

### 2. Clonar y Preparar
```bash
git clone [https://github.com/dragonkael/IF_ASR.git](https://github.com/dragonkael/IF_ASR.git)
cd IF_ASR
npm install
