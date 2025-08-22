# Matomo on Arch Linux: A Comprehensive Setup Guide

This document provides a complete, step-by-step guide for installing **Matomo**, a powerful open-source web analytics platform, on an **Arch Linux**.

This setup utilizes a robust and modern stack:
* **nginx** and **PHP-FPM** run directly on the host for optimal performance.
* **MySQL** is containerized using **Docker** for easy management and isolation.

---

## 📋 1. Prerequisites

Before you begin, ensure your system meets the following requirements:

* You have an **Linux** system.
* **Docker** is installed and running.
* You have a user with `sudo` privileges.
* You have a running MySQL container. For this guide, we'll assume its name is `amrit-mysql`.

---

## 🐬 2. Prepare the MySQL Database

First, we'll create a dedicated database and user for Matomo within your Dockerized MySQL container. This script is idempotent, meaning it will safely `DROP` and recreate the database and user if they already exist, ensuring a clean slate.

1.  **Verify the MySQL container is running:**
    ```bash
    docker ps
    ```
    *You should see your MySQL container in the output list.*

2.  **Execute the database setup script:**
    This command logs into your MySQL container and runs a series of SQL commands to prepare the environment.

    ```bash
    # Replace 'amrit-mysql' with your container name and 'root123' with your MySQL root password.
    docker exec -i amrit-mysql mysql -uroot -proot123 <<'EOF'
    DROP DATABASE IF EXISTS matomo_db;
    DROP USER IF EXISTS 'matomo_user'@'%';
    CREATE DATABASE matomo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    CREATE USER 'matomo_user'@'%' IDENTIFIED BY 'matomo123';
    GRANT ALL PRIVILEGES ON matomo_db.* TO 'matomo_user'@'%';
    FLUSH PRIVILEGES;
    EOF
    ```
    > **Note:** This creates a user named `matomo_user` with the password `matomo123`. For a production environment, always use a strong, securely generated password.

---

## 📦 3. Install Host Dependencies

Next, install nginx, PHP, and the necessary PHP extensions on your Arch Linux host.

1.  **Install packages using Pacman:**
    ```bash
    sudo pacman -Syu nginx php php-fpm unzip wget
    ```

2.  **Enable and start the services:**
    The `enable --now` command both starts the services immediately and ensures they launch automatically on system boot.
    ```bash
    sudo systemctl enable --now php-fpm nginx
    ```

---

## 📂 4. Download Matomo

Now, we will download the latest version of Matomo and place it in the web server's root directory, setting the correct permissions.

1.  **Create the web directory and set initial ownership:**
    ```bash
    sudo mkdir -p /srv/http/matomo
    sudo chown $USER:$USER /srv/http/matomo
    ```

2.  **Download and extract the Matomo files:**
    This sequence downloads the latest release, extracts it to a temporary folder, moves the contents to the final destination, and cleans up the temporary files.
    ```bash
    cd ~
    wget [https://builds.matomo.org/matomo-latest.zip](https://builds.matomo.org/matomo-latest.zip)
    unzip matomo-latest.zip -d matomo-temp
    mv matomo-temp/matomo/* /srv/http/matomo/
    rm -rf matomo-temp matomo-latest.zip
    ```

3.  **Set final file permissions:**
    It's crucial to set the correct ownership and permissions so that the web server (`http` user) can read, write, and execute files as needed.
    ```bash
    # Set ownership to the web server user
    sudo chown -R http:http /srv/http/matomo
    
    # Set standard permissions: 775 for directories, 664 for files
    sudo find /srv/http/matomo -type d -exec chmod 775 {} \;
    sudo find /srv/http/matomo -type f -exec chmod 664 {} \;
    ```

---

## ⚙️ 5. Configure Nginx

We need to tell nginx how to serve the Matomo application. We'll do this by creating a dedicated virtual host configuration file.

1.  **Create the nginx virtual host file:**
    The following command creates the configuration file at `/etc/nginx/sites-available/matomo.conf`.
    ```bash
    sudo mkdir -p /etc/nginx/sites-available
    sudo tee /etc/nginx/sites-available/matomo.conf > /dev/null << 'EOF'
    server {
        listen 80 default_server;
        server_name localhost; # Replace with your domain in production

        root   /srv/http/matomo;
        index  index.php;

        access_log  /var/log/nginx/matomo.access.log;
        error_log   /var/log/nginx/matomo.error.log;

        # Standard file serving
        location / {
            try_files $uri $uri/ =404;
        }

        # Pass PHP scripts to PHP-FPM
        location ~ \.php$ {
            try_files $uri =404;
            include        fastcgi_params;
            fastcgi_pass   unix:/run/php-fpm/php-fpm.sock;
            fastcgi_index  index.php;
            fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        }

        # Block access to sensitive directories for security
        location ~ ^/(config|tmp|core|lang) {
            deny all;
            return 403;
        }

        # Block access to .htaccess files
        location ~ /\.ht {
            deny all;
        }
    }
    EOF
    ```

2.  **Enable the new site configuration:**
    We create a symbolic link from the `sites-available` directory to `sites-enabled`. This is a common practice that makes it easy to enable or disable sites.
    ```bash
    sudo mkdir -p /etc/nginx/sites-enabled
    sudo ln -sf /etc/nginx/sites-available/matomo.conf /etc/nginx/sites-enabled/matomo.conf
    ```

3.  **Ensure the main `nginx.conf` includes virtual hosts:**
    Open `/etc/nginx/nginx.conf` and verify that the `http` block contains the following line. It's usually there by default on Arch Linux.
    ```nginx
    http {
        # ... other directives
        include /etc/nginx/sites-enabled/*.conf;
        # ... other directives
    }
    ```

4.  **Test and reload nginx:**
    Always test the configuration before applying it.
    ```bash
    sudo nginx -t && sudo systemctl reload nginx
    ```

---

## 6. Run the Matomo Web Installer

With the backend configured, you can now complete the installation through the web interface.

1.  Navigate to **`http://localhost` or `http://127.0.0.1/`** (or your server's IP/domain) in your browser.
2.  Follow the on-screen instructions:
    * **System Check**: Matomo will check if all dependencies are met. Click **Next**.
    * **Database Setup**: Enter the credentials we created in Step 2.
        * Database Server: `127.0.0.1`
        * Login: `matomo_user`
        * Password: `matomo123`
        * Database Name: `matomo_db`
        * Table Prefix: `matomo_`
        * Adapter: `PDO\MYSQL`
    * **Super User**: Create your primary administrator account.
    * **Set up a Website**: Enter the details of the first website you want to track.
    * **JavaScript Tracking Code**: Copy the provided snippet. You will add this to the pages of the website you want to track.
    * **Done**: The installation is complete! Proceed to your Matomo dashboard.


