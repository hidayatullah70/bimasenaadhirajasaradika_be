const fs = require('fs');
const path = require('path');

const postmanPath = path.join(__dirname, '../../collection.json');
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

function convertPostmanToHoppscotch(pm) {
  const folders = pm.item.map((folder) => {
    const requests = (folder.item || []).map((req) => {
      const urlRaw = req.request.url.raw || '';
      // Convert {{var}} to <<var>> for Hoppscotch
      const hoppEndpoint = urlRaw.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '<<$1>>');

      const headers = (req.request.header || []).map((h) => ({
        key: h.key,
        value: h.value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '<<$1>>'),
        active: true
      }));

      let body = {
        contentType: null,
        body: null
      };

      if (req.request.body && req.request.body.mode === 'raw') {
        body = {
          contentType: 'application/json',
          body: req.request.body.raw || ''
        };
      }

      let auth = {
        authType: 'inherit',
        authActive: true
      };

      if (req.request.auth && req.request.auth.type === 'noauth') {
        auth = {
          authType: 'none',
          authActive: true
        };
      }

      return {
        v: 1,
        name: req.name,
        method: req.request.method,
        endpoint: hoppEndpoint,
        params: (req.request.url.query || []).map((q) => ({
          key: q.key,
          value: q.value || '',
          active: true
        })),
        headers,
        preRequestScript: '',
        testScript: req.event && req.event[0] && req.event[0].script ? req.event[0].script.exec.join('\n') : '',
        auth,
        body
      };
    });

    return {
      v: 1,
      name: folder.name,
      folders: [],
      requests,
      auth: {
        authType: 'inherit',
        authActive: true
      },
      headers: []
    };
  });

  return [
    {
      v: 2,
      name: pm.info.name || 'PT. Bhimasena Adhirajasa Radhika - Backend REST API',
      folders,
      requests: [],
      auth: {
        authType: 'bearer',
        authActive: true,
        token: '<<token>>'
      },
      headers: []
    }
  ];
}

const hoppscotchData = convertPostmanToHoppscotch(postman);
const outputPath = path.join(__dirname, '../../hoppscotch-collection.json');
fs.writeFileSync(outputPath, JSON.stringify(hoppscotchData, null, 2), 'utf8');
console.log('hoppscotch-collection.json generated successfully!');

// Also generate hoppscotch-environment.json
const envData = [
  {
    v: 1,
    id: "barak-dev-env",
    name: "Barak Local Development",
    variables: [
      {
        key: "baseUrl",
        value: "http://localhost:5000",
        secret: false
      },
      {
        key: "token",
        value: "",
        secret: false
      }
    ]
  }
];

const envOutputPath = path.join(__dirname, '../../hoppscotch-environment.json');
fs.writeFileSync(envOutputPath, JSON.stringify(envData, null, 2), 'utf8');
console.log('hoppscotch-environment.json generated successfully!');
