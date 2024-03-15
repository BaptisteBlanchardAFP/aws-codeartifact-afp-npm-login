const core = require('@actions/core');
const io = require('@actions/io');
const fs = require('fs');
const codeArtifact = require('@aws-sdk/client-codeartifact');

async function run() {
   const region = core.getInput('region', { required: true });
   const domain = core.getInput('repo-domain', { required: true });
   const account = core.getInput('account-number', { required: true });
   const duration = core.getInput('duration', { required: false });
   const repo = core.getInput('repo-name', { required: true });
   const path = core.getInput('settings-path', { required: true });

   const client = new codeArtifact.CodeartifactClient({ region: region });
   const authCommand = new codeArtifact.GetAuthorizationTokenCommand({
      domain: domain,
      domainOwner: account,
      durationSeconds: duration
   });

   const response = await client.send(authCommand);
   const authToken = response.authorizationToken;
   if (response.authorizationToken === undefined) {
      throw Error(`Auth Failed: ${response.$metadata.httpStatusCode} (${response.$metadata.requestId})`);
   }

   console.log("Auth token:", authToken);
   generateNPMRCFile(domain, account, region, repo, authToken, path);

   core.setOutput('registry', `https://${domain}-${account}.d.codeartifact.${region}.amazonaws.com`);
   core.setSecret(authToken);
}

async function generateNPMRCFile(domain, account, region, repo, authToken, path, mirror) {

   await io.rmRF(path);

   const file = `@afp:registry=https://${domain}-${account}.d.codeartifact.${region}.amazonaws.com/npm/${repo}
//https://${domain}-${account}.d.codeartifact.${region}.amazonaws.com/npm/${repo}/:_authToken=${authToken}
registry=https://registry.npmjs.com`;

   process.env["CODEARTIFACT_AUTH_TOKEN"] = authToken;

   console.log(".NPMRC, located at:", path);
   console.log(file);

   fs.writeFile(path, file, { flag: 'wx' }, (callback) => {
      if (callback) core.setFailed(callback);
   });
}

module.exports = run;

if (require.main === module) {
   run();
}
