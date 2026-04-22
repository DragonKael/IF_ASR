<?php
$host = "10.0.0.2";
$port = "5432";
$data_base = "db_proyecto";
$user = "admin";
$password = "uac_password";

$db_connection = pg_connect("host=$host port=$port dbname=$data_base user=$user password=$password");

if (!$db_connection) {
    die("Error de conexión a la base de datos.");
}
?>
