// Maps each subdomain to its MySQL database
module.exports = {
  'shakya-dist.lumac.cc': {
    database: 'sakya_dist',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  localhost: {
    database: 'sakya_dist',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
  '127.0.0.1': {
    database: 'sakya_dist',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
};
