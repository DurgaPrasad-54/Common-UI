# Matomo on Ubuntu: A Comprehensive Setup Guide

This document provides a complete, step-by-step guide for installing **Matomo**, a powerful open-source web analytics platform, on an **Ubuntu** system.

This setup utilizes a robust and modern stack:
* **nginx** and **PHP-FPM** run directly on the host for optimal performance.
* **MySQL** is containerized using **Docker** for easy management and isolation.

---

## 📋 1. Prerequisites

Before you begin, ensure your system meets the following requirements:

* You have an **Ubuntu** system (18.04 LTS or later recommended).
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

Next, install nginx, PHP, and the necessary PHP extensions on your Ubuntu host.

1.  **Update package list and install packages using APT:**
    ```bash
    sudo apt update
    sudo apt install -y nginx php-fpm php-mysql php-xml php-gd php-mbstring php-curl php-zip unzip wget
    ```

2.  **Enable and start the services:**
    ```bash
    sudo systemctl enable nginx php8.1-fpm
    sudo systemctl start nginx php8.1-fpm
    ```
    > **Note:** Replace `php8.1-fpm` with your PHP version if different. You can check with `php --version`.

---

## 📂 4. Download Matomo

Now, we will download the latest version of Matomo and place it in the web server's root directory, setting the correct permissions.

1.  **Create the web directory and set initial ownership:**
    ```bash
    sudo mkdir -p /var/www/matomo
    sudo chown $USER:$USER /var/www/matomo
    ```

2.  **Download and extract the Matomo files:**
    This sequence downloads the latest release, extracts it to a temporary folder, moves the contents to the final destination, and cleans up the temporary files.
    ```bash
    cd ~
    wget https://builds.matomo.org/matomo-latest.zip
    unzip matomo-latest.zip -d matomo-temp
    mv matomo-temp/matomo/* /var/www/matomo/
    rm -rf matomo-temp matomo-latest.zip
    ```

3.  **Set final file permissions:**
    It's crucial to set the correct ownership and permissions so that the web server (`www-data` user) can read, write, and execute files as needed.
    ```bash
    # Set ownership to the web server user
    sudo chown -R www-data:www-data /var/www/matomo
    
    # Set standard permissions: 755 for directories, 644 for files
    sudo find /var/www/matomo -type d -exec chmod 755 {} \;
    sudo find /var/www/matomo -type f -exec chmod 644 {} \;
    
    # Set write permissions for specific directories that Matomo needs to write to
    sudo chmod -R 755 /var/www/matomo/tmp
    sudo chmod -R 755 /var/www/matomo/config
    ```

---

## ⚙️ 5. Configure Nginx

We need to tell nginx how to serve the Matomo application. We'll do this by creating a dedicated virtual host configuration file.

1.  **Create the nginx virtual host file:**
    The following command creates the configuration file at `/etc/nginx/sites-available/matomo`.
    ```bash
    sudo tee /etc/nginx/sites-available/matomo > /dev/null << 'EOF'
    server {
        listen 80 default_server;
        server_name localhost; # Replace with your domain in production

        root /var/www/matomo;
        index index.php;

        access_log /var/log/nginx/matomo.access.log;
        error_log /var/log/nginx/matomo.error.log;

        # Standard file serving
        location / {
            try_files $uri $uri/ =404;
        }

        # Pass PHP scripts to PHP-FPM
        location ~ \.php$ {
            try_files $uri =404;
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
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

        # Block access to sensitive files
        location ~ \.(ini|log|conf)$ {
            deny all;
        }
    }
    EOF
    ```
    > **Note:** Replace `php8.1-fpm.sock` with your PHP version if different.

2.  **Disable the default nginx site and enable Matomo:**
    ```bash
    sudo unlink /etc/nginx/sites-enabled/default
    sudo ln -s /etc/nginx/sites-available/matomo /etc/nginx/sites-enabled/
    ```

3.  **Ensure the main `nginx.conf` includes virtual hosts:**
    Open `/etc/nginx/nginx.conf` and verify that the `http` block contains the following line. It's usually there by default on Ubuntu.
    ```nginx
    http {
        # ... other directives
        include /etc/nginx/sites-enabled/*;
        # ... other directives
    }
    ```
    > **Note:** Ubuntu uses `/etc/nginx/sites-enabled/*` (without `.conf` extension) unlike some other distributions.

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

---

## 🔧 7. Additional Ubuntu-Specific Notes

* **Firewall Configuration**: If you have UFW enabled, allow HTTP traffic:
  ```bash
  sudo ufw allow 'Nginx HTTP'
  ```

* **PHP Version Management**: Ubuntu often has multiple PHP versions. Check your active version:
  ```bash
  php --version
  sudo systemctl status php*-fpm
  ```

* **Troubleshooting**: If you encounter permission issues, ensure the web server user has proper access:
  ```bash
  sudo usermod -a -G www-data $USER
  ```


