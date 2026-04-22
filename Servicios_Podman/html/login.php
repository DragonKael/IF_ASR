<?php
session_start();
require_once "db.php";

$message = "";

if (isset($_POST['login'])) {
    $email = $_POST['email'];
    $pass = $_POST['password'];

    $query = "SELECT * FROM users WHERE email=$1";
    $res = pg_query_params($db_connection, $query, [$email]);
    $user = pg_fetch_assoc($res);

    if ($user && $user['habilitado'] === '1' && password_verify($pass, $user['password'])) {
        $_SESSION['user_id'] = $user['iduser'];
        $_SESSION['name'] = $user['name'];
        header("Location: index.php");
        exit;
    } else {
        $message = "Usuario o contraseña incorrectos, o usuario no habilitado.";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
<title>Login</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container mt-5">
<h2>Login</h2>
<?php if($message) echo "<div class='alert alert-danger'>$message</div>"; ?>
<form method="POST">
<div class="mb-3">
<label>Email</label>
<input type="email" name="email" class="form-control" required>
</div>
<div class="mb-3">
<label>Contraseña</label>
<input type="password" name="password" class="form-control" required>
</div>
<button name="login" class="btn btn-success">Ingresar</button>
</form>
<p class="mt-3">¿No tienes cuenta? <a href="signup.php">Regístrate</a></p>
</body>
</html>
