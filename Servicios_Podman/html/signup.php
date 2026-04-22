<?php
session_start();
require_once "db.php";

$message = "";

if (isset($_POST['signup'])) {
    $name = $_POST['name'];
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);

    $query = "INSERT INTO users (name, email, password, habilitado) VALUES ($1,$2,$3,B'1')";
    $res = pg_query_params($db_connection, $query, [$name, $email, $password]);

    if ($res) {
        $message = "Usuario creado con éxito. <a href='login.php'>Ingresar</a>";
    } else {
        $message = "Error al crear usuario. ¿El email ya existe?";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
<title>Registro</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container mt-5">
<h2>Registro de Usuario</h2>
<?php if($message) echo "<div class='alert alert-info'>$message</div>"; ?>
<form method="POST">
<div class="mb-3">
<label>Nombre</label>
<input type="text" name="name" class="form-control" required>
</div>
<div class="mb-3">
<label>Email</label>
<input type="email" name="email" class="form-control" required>
</div>
<div class="mb-3">
<label>Contraseña</label>
<input type="password" name="password" class="form-control" required>
</div>
<button name="signup" class="btn btn-primary">Registrar</button>
</form>
</body>
</html>
