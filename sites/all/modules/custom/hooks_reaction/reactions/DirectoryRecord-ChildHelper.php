<?php /*

    [--] PURPOSE [--]

    @TODO

    [--] TECHNICAL NOTES [--]

    @TODO

*/

$GLOBALS['DirRecordHelperChild_updateRefNid'] = null;
$GLOBALS['DirRecordHelperChild_noPostProc'] = false;
$GLOBALS['DirRecordHelperChild_ignoreNids'] = array();

hooks_reaction_add('HOOK_node_postsave',
    function ($node) {

        // We only care about Text-Asset nodes here
        if ( $node->type !== 'directory_record_content_type' ) {
            return;
        }

        // This is needed in order to prevent infinite loops (see later code)
        if ( $GLOBALS['DirRecordHelperChild_noPostProc'] ) {
            return;
        }
        if ( in_array(intval($node->nid), $GLOBALS['DirRecordHelperChild_ignoreNids']) ) {
            return;
        }

        $nodeNew = $node;
        $nodeOld = ( empty($node->original) ? false : $node->original );

        if (!empty($nodeNew->field_child_records_en['und']) && $nodeNew->field_child_records_en['und'] != $nodeOld->field_child_records_en['und'] ) {

            foreach($nodeNew->field_child_records_en['und'] as $child) {

                // we found referenced node
                $nodeRef = node_load($child['target_id']);

                if (!empty($nodeRef)) {

                    $nodeRef->field_parent_record_en['und'][0]['target_id'] = $nodeNew->nid;

                    // And remember that we will trigger this same HOOK_node_presave with node_save()
                    // So we'll set a global No-Process flag to prevent infinite loops
                    $GLOBALS['DirRecordHelperChild_noPostProc'] = true;
                    $GLOBALS['DirRecordHelperChild_ignoreNids'][] = intval($nodeRef->nid);
                    node_save($nodeRef);
                    $GLOBALS['DirRecordHelperChild_noPostProc'] = false;

                    drupal_set_message(
                        "Note: Since you have updated \"{$node->title}\" asset, referenced toggle field on \"{$nodeRef->title}\" has been updated",
                        "warning",
                        FALSE
                    );
                }
            }
        }

    } // End Hook: node_presave

); // End hooks_reaction_add() call
