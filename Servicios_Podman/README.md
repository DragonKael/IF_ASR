# Proyecto de Investigación Formatica: Implementación de Página Web Dinámica mediante Contenedores

## 🏛️ Universidad Andina del Cusco

**Facultad de Ingeniería y Arquitectura** **Escuela Profesional de Ingeniería de Sistemas** **Asignatura:** Arquitectura de Sistemas de Redes (ASR)
**Grupo:** 03
**Semestre:** 2026-I

---

## 📋 Descripción General

Este repositorio documenta la implementación técnica de una infraestructura de red basada en microservicios utilizando contenedores **Podman** sobre **Fedora Server 43**. El proyecto integra un servidor web dinámico (NGINX/PHP), base de datos (PostgreSQL), servidor DNS (Bind9) y FTP (vsftpd), operando en una arquitectura de red de Clase A.

## 🛠️ Especificaciones Técnicas del Host

- **Sistema Operativo:** Fedora Linux 43 (Forty Three) x86_64.
- **Kernel:** 6.19.12-200.fc43.x86_64.
- **Orquestador:** Podman & Podman-Compose (Docker-less architecture).
- **Interfaz de Red:** `enp0s8` (Configurada en modo promiscuo).

---

## 🌐 Arquitectura de Red y Topología

Se ha implementado una red **Macvlan** para permitir que cada contenedor posea su propia dirección MAC e IP dentro del segmento físico, facilitando la auditoría de tráfico mediante Wireshark[cite: 41, 52].

### 🖥️ Direccionamiento de Servicios (Contenedores)

| Servicio                | FQDN                               | Dirección IP | Puerto   |
| :---------------------- | :--------------------------------- | :------------ | :------- |
| **Host Fedora**   | `asr2026i`                       | `10.0.0.10` | N/A      |
| **Base de Datos** | `db.misposts_grupo3_2026_I.org`  | `10.0.0.2`  | 5432     |
| **Interfaz DB**   | N/A (Solo IP)                      | `10.0.0.3`  | 8080     |
| **Servidor Web**  | `www.misposts_grupo3_2026_I.org` | `10.0.0.4`  | 80       |
| **Servidor DNS**  | `ns1.misposts_grupo3_2026_I.org` | `10.0.0.5`  | 53 (UDP) |
| **Servidor FTP**  | `ftp.misposts_grupo3_2026_I.org` | `10.0.0.6`  | 21       |

### 🏠 Red de Host Físicos (RED 10.2.0.x/8)

| Usuario                   | Dispositivo            | Dirección IP |
| :------------------------ | :--------------------- | :------------ |
| **Infraestructura** | Host del Fedora Server | `10.2.0.10` |
| **Fredy**           | Host Físico (Windows) | `10.2.0.5`  |
| **Jadee**           | Host Físico (Windows) | `10.2.0.3`  |
| **Luciana**         | Host Físico (Windows) | `10.2.0.4`  |
| **Ulises**          | Host Físico (Windows) | `10.2.0.7`  |

### 💻 Clientes y Máquinas Virtuales (Red 10.1.0.x/8)

| Usuario           | Sistema Operativo       | Dirección IP |
| :---------------- | :---------------------- | :------------ |
| **Fredy**   | Linux Mint              | `10.1.0.5`  |
| **Jadee**   | Ubuntu                  | `10.1.0.3`  |
| **Luciana** | CentOS                  | `10.1.0.4`  |
| **Ulises**  | Arch Linux              | `10.1.0.7`  |
| **Yhojan**  | Windows 11 (Físico/VM) | `10.1.0.6`  |

*Nota: El Gateway de la red es `10.0.0.1` y el DNS primario es `10.0.0.5`.*

---

### 🖥️ Configuración Permanente de Red (Interfaz enp0s8 / Ethernet)

Los siguientes comandos configuran de manera definitiva la IP estática, el Gateway y el DNS. Se ha ajustado la máscara a /8 según el requerimiento del segmento Clase A.

#### 🐧 Sistemas Linux (Mint, Ubuntu, CentOS)

Utilizan NetworkManager para asegurar que el cambio persista tras el reinicio.

| Usuario | Comando de Configuración                                                                                                                      |
| :------ | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Fredy   | ``sudo nmcli con mod enp0s8 ipv4.addresses 10.1.0.5/8 ipv4.gateway 10.0.0.1 ipv4.dns 10.0.0.5 ipv4.method manual && sudo nmcli con up enp0s8`` |
| Jadee   | ``sudo nmcli con mod enp0s8 ipv4.addresses 10.1.0.3/8 ipv4.gateway 10.0.0.1 ipv4.dns 10.0.0.5 ipv4.method manual && sudo nmcli con up enp0s8`` |
| Luciana | ``sudo nmcli con mod enp0s8 ipv4.addresses 10.1.0.4/8 ipv4.gateway 10.0.0.1 ipv4.dns 10.0.0.5 ipv4.method manual && sudo nmcli con up enp0s8`` |

#### 🏹 Arch Linux (systemd-networkd)

Ulises:

```bash
echo -e "[Match]\nName=enp0s8\n\n[Network]\nAddress=10.1.0.7/8\nGateway=10.0.0.1\nDNS=10.0.0.5" | sudo tee /etc/systemd/network/20-wired.network && sudo systemctl restart systemd-networkd
```

#### 🪟 Windows 11 (PowerShell - Administrador)

Yhojan:

```powershell
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 10.1.0.6 -PrefixLength 8 -DefaultGateway 10.0.0.1; Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 10.0.0.5
```

#### 🛠️ Notas de Implementación

Interfaces: Se ha estandarizado el uso de enp0s8 para todos los entornos Linux.
Persistencia: En Linux, nmcli modifica los archivos en /etc/NetworkManager/system-connections/. En Windows, los cambios se aplican al registro de interfaces de red.
Validación: Tras ejecutar, puedes probar la conectividad con ping 10.0.0.1 para verificar el alcance al Gateway.

## 🚀 Configuración del Servidor Fedora 43

### 1. Preparación de la Interfaz y Red

Para habilitar la comunicación Macvlan en entornos virtualizados (VirtualBox), se activó el modo promiscuo y se ajustó el filtrado de ruta inversa del kernel:

```bash
# Activar modo promiscuo
sudo ip link set enp0s8 promisc on

# Deshabilitar rp_filter para permitir tráfico de contenedores
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
sudo sysctl -w net.ipv4.conf.enp0s8.rp_filter=0
```

### 2. Configuración de Seguridad (Firewall y SELinux)

Se ha configurado la zona public con políticas permisivas para el segmento local y la apertura de puertos críticos para la sustentación:

#### 🌐 Servicios y Protocolos Autorizados

| Categoría                | Servicios                            |
| :------------------------ | :----------------------------------- |
| **Infraestructura** | `dns`, `mdns`, `dhcpv6-client` |
| **Acceso y Web**    | `ssh`, `http`                    |

#### 🔌 Apertura de Puertos Específicos

- **Servicios Web:** `80/tcp` (HTTP) y `443/tcp` (HTTPS).
- **Gestión de Datos:** `8080/tcp` (PgAdmin) y `5432/tcp` (PostgreSQL).
- **Resolución de Nombres:** `53/tcp`, `53/udp` y `953/tcp` (BIND9).
- **Transferencia de Archivos:** `20-21/tcp` (FTP).
- **Desarrollo:** `3000/tcp` y `3001/udp` (Servicios Adicionales).

#### 📜 Políticas Avanzadas (Rich Rules)

Se ha establecido un nivel de **confianza plena** para el tráfico originado en el segmento Clase A:

> `rule family="ipv4" source address="10.0.0.0/8" accept`

#### 🔄 Enrutamiento y Tráfico Interno

Para facilitar la visibilidad y salida a internet de los microservicios, se han habilitado las siguientes capacidades de kernel:

- **IP Masquerade:** Activo.
- **IP Forwarding:** Activo.

```Bash
# Agregar servicios base
sudo firewall-cmd --zone=public --add-service={dns,http,mdns,ssh,dhcpv6-client} --permanent

# Abrir puertos de Aplicación y Base de Datos
sudo firewall-cmd --zone=public --add-port={80/tcp,443/tcp,8080/tcp,5432/tcp} --permanent

# Abrir puertos de Red y Transferencia (DNS y FTP)
sudo firewall-cmd --zone=public --add-port={53/tcp,53/udp,953/tcp,20-21/tcp} --permanent

# Abrir puertos de Servicios Adicionales
sudo firewall-cmd --zone=public --add-port={3000/tcp,3001/udp} --permanent

# Agregar Rich Rule para confianza plena en el segmento 10.0.0.0/8
sudo firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" accept' --permanent

# Activar Forwarding y Masquerade (para ruteo de contenedores)
sudo firewall-cmd --zone=public --add-masquerade --permanent
# Nota: El forwarding se activa globalmente o por zona según la versión
sudo firewall-cmd --permanent --add-forward

# Recargar para aplicar todos los cambios
sudo firewall-cmd --reload
```

### 3. Seguridad SELinux

Durante la fase de desarrollo e implementación del CRUD, se utilizó el modo permisivo para diagnosticar bloqueos de red:

```Bash
sudo setenforce 0
```

Para la persistencia, se generaron módulos de política personalizados (my-phpfpm.te y my-phpfpm.pp) que permiten que el proceso PHP-FPM realice conexiones de red hacia el contenedor de PostgreSQL bajo políticas de SELinux.

```bash

# Cambiar a modo Enforcing inmediatamente

sudo setenforce 1

# Hacer que el modo Enforcing sea permanente tras reinicios

sudo sed -i 's/SELINUX=permissive/SELINUX=enforcing/g' /etc/selinux/config
```

## 🏗️ Implementación de Microservicios

Orquestación (compose.yaml)
El despliegue utiliza el driver macvlan vinculado a la interfaz física:

```YAML
networks:
  asr_net:
    driver: macvlan
    driver_opts:
      parent: enp0s8
    ipam:
      config:
        - subnet: 10.0.0.0/8
          gateway: 10.0.0.1

```

Base de Datos (PostgreSQL)
Se implementó el esquema relacional con el campo habilitado de tipo BIT como requisito crítico:

```SQL
CREATE TABLE users (
    iduser SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(100),
    habilitado BIT(1),
    password VARCHAR(255)
);

```

## Servidor DNS (Bind9)

Se configuró la directiva check-names ignore para permitir el uso de guiones bajos en el dominio virtual:

```Plaintext


zone "misposts_grupo3_2026_I.org" {
    type master;
    file "/etc/bind/db.misposts_grupo3_2026_I.org";
    check-names ignore;
};
```

### 💻 Desarrollo Web (CRUD & Autenticación)

El sistema web desarrollado en PHP incluye los siguientes módulos:
login.php / signup.php: Gestión de sesiones y registro de nuevos usuarios.
db.php: Clase de conexión PDO/Postgres.
index.php: Panel principal para el listado de posts mediante consultas dinámicas.
test_comments.php: Módulo para la gestión de comentarios asociados a posts.
📂 Estructura de Directorios

```Plaintext


.
├── compose.yaml
├── dns_config
│   ├── db.misposts_grupo3_2026_I.org
│   └── named.conf.local
├── ftp
│   └── grupo3
├── html (CRUD & Login)
│   ├── db.php
│   ├── index.php
│   ├── login.php
│   ├── logout.php
│   ├── signup.php
│   └── test_comments.php
├── my-phpfpm.te (SELinux Policy)
├── nginx
│   └── html
└── postgres
    └── init.sql
```

### 🧪 Pruebas de Funcionamiento y Validación

Resolución de Nombres: Ejecución de ``dig @10.0.0.5 www.misposts_grupo3_2026_I.org`` desde los clientes.

Autenticación: Acceso mediante el módulo login.php validando credenciales contra la tabla users.

CRUD: Inserción, lectura y borrado de posts y comentarios reflejados en tiempo real en la página dinámica.

Captura de Paquetes: Uso de Wireshark en la interfaz del host para analizar el handshake de TCP y las consultas SQL.

#### 🔍 Filtros de Visualización en Clientes (Wireshark GUI)

Para monitorear la interacción con los microservicios específicos, cada cliente debe aplicar los filtros ajustados a las IPs de los contenedores:

- **Filtro para Yhojan (Windows) → Servidor Web:**  
    `ip.addr == 10.1.0.6 and ip.addr == 10.0.0.4 and tcp.port == 80`

- **Filtro para Fredy (Linux Mint) → Base de Datos:**  
    `ip.addr == 10.1.0.5 and ip.addr == 10.0.0.2 and tcp.port == 5432`

- **Filtro para Jadee (Ubuntu) → Interfaz PgAdmin:**  
    `ip.addr == 10.1.0.3 and ip.addr == 10.0.0.3 and tcp.port == 8080`

- **Filtro para Luciana (CentOS) → Servidor FTP:**  
    `ip.addr == 10.1.0.4 and ip.addr == 10.0.0.6 and tcp.port == 21`

- **Filtro para Ulises (ArchLinux) → Consultas DNS:**  
    `ip.addr == 10.1.0.7 and ip.addr == 10.0.0.5 and udp.port == 53`

#### 🛠️ Filtros de Auditoría General (Tráfico hacia el Host)

Para validar la comunicación con el Host Fedora (asr2026i) y el flujo de los servicios adicionales:

- **Establecimiento de conexión con el Host (10.0.0.10):**  
    `tcp.flags.syn == 1 and ip.dst == 10.0.0.10`

- **Tráfico Global de la Aplicación (Puertos 3000/3001):**  
    `(tcp.port == 3000 or udp.port == 3001) and ip.addr == 10.0.0.10`

- **Monitoreo de Consultas DNS Recurrentes (FQDN):**  
    `dns.qry.name contains "misposts_grupo3_2026_I.org"`

### Conclusiones Técnicas

El uso de Macvlan permite una transparencia total a nivel de red, esencial para el análisis de protocolos en Capa 2 y 3.
Podman facilita una gestión de contenedores más segura en Fedora al operar sin un demonio centralizado (daemonless).
La resolución de conflictos entre los estándares RFC y los requerimientos del dominio (_) se solventó mediante ajustes a nivel de servidor BIND9.
