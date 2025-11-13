<?php
/**
 * KeyScopeX Panel - Logout Handler
 * LineWatchX Project
 */

session_start();
session_destroy();

header('Location: login.php');
exit();
?>

