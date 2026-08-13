        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Poppins', 'Plus Jakarta Sans', 'sans-serif'],
                        mono: ['Fira Code', 'monospace'],
                    },
                    colors: {
                        // Đồng bộ brand với toàn app: accent tím của edu-theme.css,
                        // thay cho mỗi trang một màu (xanh lá / đỏ) trước đây.
                        brand: {
                            primary: '#b93ff0',
                            secondary: '#e08cf9',
                            accent: '#34D399',
                            dark: '#4B4B4B',
                        }
                    }
                }
            }
        }
