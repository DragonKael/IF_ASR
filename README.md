🌐 Guía de Configuración de Red (Sprint 24h)Para que el proyecto funcione, todos deben estar conectados al mismo switch o red local y configurar sus IPs manualmente.📋 Tabla de Asignación de IPsIntegranteSistema OperativoIP EstáticaMáscara de RedServidor (Tú)Fedora KDE172.16.0.1255.255.0.0YhojanWindows172.16.0.2255.255.0.0FredyLinux Mint172.16.0.3255.255.0.0JadeeUbuntu172.16.0.4255.255.0.0UlisesArch Linux172.16.0.5255.255.0.0💻 Comandos de Configuración Rápida1. Para Windows (Yhojan)Abre PowerShell como Administrador y ejecuta (cambia "Ethernet" por el nombre de tu interfaz si es necesario):PowerShellNew-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 172.16.0.2 -PrefixLength 16
2. Para Linux (Mint, Ubuntu, Arch) - Vía TerminalEjecuta estos comandos para configurar la IP mediante nmcli (Network Manager):Bash# 1. Identifica tu conexión
nmcli connection show

# 2. Configura la IP (Reemplaza 'Wired connection 1' por el nombre de la tuya)
sudo nmcli connection modify 'Wired connection 1' ipv4.addresses 172.16.0.X/16 ipv4.method manual

# 3. Reinicia la conexión
sudo nmcli connection up 'Wired connection 1'
Nota: Reemplaza la X por el número que te corresponde en la tabla.3. Verificación de ConexiónUna vez configurados, todos deben hacerle ping al servidor para validar:Bashping 172.16.0.1
