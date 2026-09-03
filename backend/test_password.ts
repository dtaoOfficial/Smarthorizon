import bcrypt from 'bcryptjs';
bcrypt.compare('8762020578', '$2a$10$Bq70DkMBz1ap11Ka0uP8Pu4z6GoEY2eyhG6W5loncj8IvvfgODsim').then(res => console.log('Match:', res));
