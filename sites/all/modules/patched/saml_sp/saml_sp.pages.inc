<?php
/**
 * @file
 * User pages for the SAML Service Provider module.
 */

/**
 * Page callback to complete the SAML authentication process.
 * This is the consumer endpoint for all SAML authentication requests.
 */
function saml_sp__endpoint() {
  // Check that the request is a valid SAML response.
  if (!saml_sp__is_valid_authentication_response()) {
    // Not a valid incoming auth-message from an IDP, so abort.
    drupal_goto();
  }

  // The OneLogin_Saml_Response object uses the settings to verify the validity
  // of a request, in OneLogin_Saml_Response::isValid(), via XMLSecurityDSig.
  // Extract the incoming ID (the `inresponseto` parameter of the
  // `<samlp:response` XML node).

  if ($inbound_id = _saml_sp__extract_inbound_id($_POST['SAMLResponse'])) {
    if ($request = saml_sp__get_tracked_request($inbound_id)) {
      $idp = saml_sp_idp_load($request['idp']);
      $settings = saml_sp__get_settings($idp);
      // Creating Saml2 Settings object from array
      $saml_settings = new OneLogin_Saml2_Settings($settings);
      $saml_response = new saml_sp_Response($saml_settings, $_POST['SAMLResponse']);

      // Remove the now-expired tracked request.
      cache_clear_all($inbound_id, 'saml_sp_request_tracking_cache');

      // Try to check the validity of the samlResponse.
      try {
        // $saml_response->isValid() will throw various exceptions to communicate
        // any errors. Sadly, these are all of type Exception - no subclassing.
        $is_valid = $saml_response->isValid();
        error_log("is_valid is: " . intval($is_valid) );
      }
      catch (Exception $e) {
        // @TODO: inspect the Exceptions, and log a meaningful error condition.
        watchdog('saml_sp', 'Invalid response, %exception', array('%exception' => $e));
        $is_valid = FALSE;
      }

      if (!$is_valid) {
        $error = $saml_response->getError();
        list($problem) = array_reverse(explode(' ', $error));

        switch ($problem) {
          case 'Responder':
            $message = t('There was a problem with the response from @idp_name. Please try again later.', array('@idp_name' => $idp->name));
            break;
          case 'Requester':
            $message = t('There was an issue with the request made to @idp_name. Please try again later.', array('@idp_name' => $idp->name));
            break;
          case 'VersionMismatch':
            $message = t('SAML VersionMismatch between @idp_name and @site_name. Please try again later.', array('@idp_name' => $idp->name, '@site_name' => variable_get('site_name', 'Drupal')));
            break;
        }
        if (!empty($message)) {
          drupal_set_message($message, 'error');
        }
        watchdog('saml_sp', 'Invalid response, @error: <pre>@response</pre>', array('@error' => $error, '@response' => print_r($saml_response, TRUE)), WATCHDOG_ERROR);
      }


      // Invoke the callback function.
      $callback = $request['callback'];
      error_log("IT IS: ".$callback);
      $result = $callback($is_valid, $saml_response);

      // The callback *should* redirect the user to a valid page.
      // Provide a fail-safe just in case it doesn't.
      if (empty($result)) {
        drupal_goto('user');
      }
      else {
        return $result;
      }
    }
  }
  // Failover: redirect to the homepage.
  watchdog('saml_sp', 'Failover: redirect to the homepage. No inbound ID or something.');
  drupal_goto();
}

/**
 * Check that a request is a valid SAML authentication response.
 *
 * @return Boolean
 */
function saml_sp__is_valid_authentication_response() {
  return ($_SERVER['REQUEST_METHOD'] == 'POST' && !empty($_POST['SAMLResponse']));
}

/**
 * Page callback to initiate the SAML SLO process.
 *
 */
function saml_sp__logout() {
  // Load the IDP to authenticate against.
  $idp = saml_sp_drupal_login__get_idp();

  // Settings is a OneLogin_Saml2_Settings object.
  $settings = saml_sp__get_settings($idp);

  $auth = new OneLogin_Saml2_Auth($settings);
  // Handle SAML Request / Response and process Single LogOut
  $auth->processSLO();

  $errors = $auth->getErrors();
  if (empty($errors)) {
    watchdog('saml_sp', 'Handled SLO Request/Response from SSO.');
  }
  else {
    watchdog('saml_sp', 'Errors in SLO process: %errors', array('%errors' => implode(', ', $errors)));
  }
  // Redirect user to path defined in RelayState after logout, or to front page
  // if it's empty
  drupal_set_message(t('You have successfully logged out from all SSO services.'));
  drupal_goto($_GET['RelayState']);
}